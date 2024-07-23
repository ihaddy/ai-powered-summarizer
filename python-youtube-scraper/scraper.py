import logging
import os
import requests
from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from chromedriver_autoinstaller import install as install_chrome_driver
import time
import pika
import json
import threading
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# All levels of logs will be captured
sentry_logging = LoggingIntegration(
    level=logging.INFO,        # Capture info and above as breadcrumbs
    event_level=logging.ERROR  # Send errors as events
)
sentry_dsn = os.getenv("SENTRY_DSN", "")

if not sentry_dsn:
    print("Warning: SENTRY_DSN is not set. Sentry will not capture errors.")

sentry_sdk.init(
    dsn=sentry_dsn,
    integrations=[FlaskIntegration(), sentry_logging],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

install_chrome_driver()
app = Flask(__name__)

def scrape_video(video_id):
    logger.info(f"Starting to scrape video: {video_id}")
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    result = {"title": "", "description": "", "transcript": "", "transcriptionWithTimestamps": [], "thumbnail": ""}

    try:
        logger.info("Attempting to get transcript from Whisper Flask app")
        whisper_url = "http://192.168.1.170:5000/transcribe"
        try:
            whisper_response = requests.post(whisper_url, json={"video_id": video_id}, timeout=5)
            whisper_response.raise_for_status()
            
            response_data = whisper_response.json()
            if response_data.get('status') == 'processing':
                logger.info("Transcription is processing. Setting up RabbitMQ connection.")
                
                try:
                    connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
                    channel = connection.channel()
                    channel.queue_declare(queue='transcription_results')
                    logger.info("RabbitMQ connection established")
                
                    def callback(ch, method, properties, body):
                        logger.info(f"Received message from RabbitMQ: {body}")
                        transcription_result = json.loads(body)
                        if transcription_result['video_id'] == video_id:
                            result["transcript"] = transcription_result['text']['text']
                            result["transcriptionWithTimestamps"] = transcription_result['text']['chunks']
                            logger.info("Transcription result received and processed")
                            channel.stop_consuming()
                
                    channel.basic_consume(queue='transcription_results',
                                          auto_ack=True,
                                          on_message_callback=callback)
                
                    def consume_with_timeout():
                        logger.info("Starting to consume messages from RabbitMQ")
                        channel.start_consuming()

                    consumer_thread = threading.Thread(target=consume_with_timeout)
                    consumer_thread.start()
                    consumer_thread.join(timeout=60)  # Wait for up to 60 seconds

                    if consumer_thread.is_alive():
                        logger.warning("Timeout waiting for transcription result. Falling back to YouTubeTranscriptApi.")
                        channel.stop_consuming()
                        raise Exception("Timeout waiting for transcription result")
                except Exception as rabbitmq_error:
                    logger.error(f"Error with RabbitMQ: {str(rabbitmq_error)}. Falling back to YouTubeTranscriptApi.")
                    sentry_sdk.capture_exception(rabbitmq_error)
                    raise
            else:
                result["transcript"] = response_data["text"]["text"]
                result["transcriptionWithTimestamps"] = response_data["text"]["chunks"]
                logger.info("Transcription received from Whisper API")
            
        except requests.RequestException as e:
            logger.warning(f"Error fetching transcript from Whisper app: {str(e)}. Falling back to YouTubeTranscriptApi.")
            sentry_sdk.capture_exception(e)
            raise

    except Exception as e:
        logger.warning(f"Falling back to YouTubeTranscriptApi due to error: {str(e)}")
        sentry_sdk.capture_exception(e)
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            result["transcript"] = ' '.join([entry['text'] for entry in transcript])
            result["transcriptionWithTimestamps"] = []
            logger.info("Successfully fetched transcript using YouTubeTranscriptApi")
        except Exception as transcript_error:
            logger.error(f"Error fetching transcript: {str(transcript_error)}")
            sentry_sdk.capture_exception(transcript_error)
            result["error"] = f"Error fetching transcript: {str(transcript_error)}"

    try:
        logger.info(f"Fetching video page for {video_id}")
        driver.get(f'https://www.youtube.com/watch?v={video_id}')
        driver.execute_script("document.body.style.zoom='0.9'")
        more_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "expand"))
        )
        time.sleep(2)
        driver.execute_script("arguments[0].click();", more_button)
        time.sleep(1)
        video_description_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '#description-inline-expander > yt-attributed-string > span'))
        )
        result["title"] = driver.title.replace("- YouTube", "").strip()
        result["description"] = video_description_element.text
        result["thumbnail"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        logger.info("Successfully scraped video page")
    except Exception as e:
        logger.error(f"Error scraping video page: {str(e)}")
        sentry_sdk.capture_exception(e)
        result["error"] = f"Error scraping video page: {str(e)}"
    finally:
        driver.quit()

    logger.info(f"Finished scraping video: {video_id}")
    return result

@app.route('/scrape', methods=['GET'])
def scrape():
    video_id = request.args.get('video_id', default='80gjxcA2Jdw', type=str)
    logger.info(f"Received request to scrape video ID: {video_id}")
    try:
        scraped_data = scrape_video(video_id)
        logger.info(f"Sending scraped data for video ID: {video_id}")
        return jsonify(scraped_data)
    except Exception as e:
        logger.error(f"Error in /scrape endpoint: {str(e)}")
        sentry_sdk.capture_exception(e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=5000, debug=True)
