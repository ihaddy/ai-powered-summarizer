from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from chromedriver_autoinstaller import install as install_chrome_driver
import time

app = Flask(__name__)

def scrape_video(video_id):
    install_chrome_driver()
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")

    driver = webdriver.Chrome(options=chrome_options)

    result = {"title": "", "description": "", "transcript": ""}

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

        result["title"] = driver.title
        result["description"] = video_description_element.text

    except Exception as e:
        result["error"] = f"Error scraping video page: {str(e)}"
    finally:
        driver.quit()

    return result

@app.route('/scrape', methods=['GET'])
def scrape():
    video_id = request.args.get('video_id', default='80gjxcA2Jdw', type=str)
    scraped_data = scrape_video(video_id)
    return jsonify(scraped_data)

if __name__ == "__main__":
    app.run(debug=True)