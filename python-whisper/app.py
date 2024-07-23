from flask import Flask, request, jsonify
import yt_dlp
from transformers import pipeline
import torch
import pika
import json
import threading

app = Flask(__name__)

# Initialize RabbitMQ connection
# CHANGE THESE connection parameters to match your RabbitMQ setup
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue='transcription_queue')
channel.queue_declare(queue='transcription_results')

# Initialize the Whisper pipeline
pipe = pipeline(
    "automatic-speech-recognition",
    model="openai/whisper-large-v3",
    torch_dtype=torch.float16,
    device="cuda:0"
)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    print("Received transcription request")
    video_id = request.json['video_id']
    print(f"Video ID: {video_id}")
    
    # Immediately respond that the request is being processed
    channel.basic_publish(exchange='',
                          routing_key='transcription_queue',
                          body=json.dumps({'video_id': video_id}))
    
    return jsonify({
        "message": "Transcription request received and being processed",
        "status": "processing",
        "video_id": video_id
    }), 202

def download_youtube_audio(video_id):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'outtmpl': f'tmp/{video_id}'
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Extracting info for video: {video_id}")
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
            audio_file = ydl.prepare_filename(info)
            print(f"Audio file prepared: {audio_file}")
            return audio_file
    except Exception as e:
        print(f"Error downloading audio: {str(e)}")
        return None

def process_transcription_queue():
    def callback(ch, method, properties, body):
        data = json.loads(body)
        video_id = data['video_id']
        
        print(f"Processing transcription for video: {video_id}")
        audio_path = download_youtube_audio(video_id)
        if audio_path:
            print(f"Audio downloaded successfully: {audio_path}")
            print("Processing audio with Whisper...")
            outputs = pipe(audio_path, chunk_length_s=30, batch_size=24, return_timestamps=True)
            print("Transcription completed")
            
            # Send the result back through RabbitMQ
            result = {
                'video_id': video_id,
                'text': outputs
            }
            channel.basic_publish(exchange='',
                                  routing_key='transcription_results',
                                  body=json.dumps(result))
            print(f"Transcription result sent for video: {video_id}")
        else:
            print(f"Failed to download or process audio for video: {video_id}")
    
    channel.basic_consume(queue='transcription_queue',
                          auto_ack=True,
                          on_message_callback=callback)
    
    print('Waiting for transcription messages...')
    channel.start_consuming()

@app.route('/test', methods=['GET'])
def test():
    return "Hello, World!"

if __name__ == '__main__':
    # Start the queue processor in a separate thread
    threading.Thread(target=process_transcription_queue, daemon=True).start()
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0')
