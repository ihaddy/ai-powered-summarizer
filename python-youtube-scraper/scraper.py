import logging
import requests
from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from chromedriver_autoinstaller import install as install_chrome_driver
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

install_chrome_driver()
app = Flask(__name__)

def scrape_video(video_id):
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")  # Bypass OS security model, REQUIRED on Linux
    chrome_options.add_argument("--disable-dev-shm-usage")  # Overcome limited resource problems
    driver = webdriver.Chrome(options=chrome_options)
    result = {"title": "", "description": "", "transcript": "", "transcriptionWithTimestamps": [], "thumbnail": ""}

    try:
        # Try getting the transcript from the Whisper Flask app
        whisper_url = f"http://192.168.1.170:5000/transcribe"
        whisper_response = requests.post(whisper_url, json={"video_id": video_id})

        if whisper_response.status_code == 200:
            whisper_data = whisper_response.json()
            result["transcript"] = whisper_data["text"]["text"]
            result["transcriptionWithTimestamps"] = whisper_data["text"]["chunks"]
        else:
            raise Exception(f"Error fetching transcript from Whisper app: {whisper_response.text}")

    except Exception as e:
        logger.warning(f"Error fetching transcript from Whisper app: {str(e)}. Falling back to YouTubeTranscriptApi.")

        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            result["transcript"] = ' '.join([entry['text'] for entry in transcript])
        except Exception as e:
            result["error"] = f"Error fetching transcript: {str(e)}"

    try:
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
    except Exception as e:
        result["error"] = f"Error scraping video page: {str(e)}"
    finally:
        driver.quit()

    return result

@app.route('/scrape', methods=['GET'])
def scrape():
    video_id = request.args.get('video_id', default='80gjxcA2Jdw', type=str)
    logger.info(f"Received request to scrape video ID: {video_id}")
    scraped_data = scrape_video(video_id)
    logger.info(f"Sending scraped data for video ID: {video_id}")
    return jsonify(scraped_data)

if __name__ == "__main__":
    logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=5000, debug=True)