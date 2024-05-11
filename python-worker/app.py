import os
from langchain import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

OUTPUT_PARSER = StrOutputParser()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

CHAT_MODEL = ChatOpenAI(api_key=OPENAI_API_KEY, model_name="gpt-4-1106-preview")

PROMPT = ChatPromptTemplate.from_messages([
    ["system", "Generate a dynamic prompt for another LLM to give a comprehensive summary of the following video transcript. Assess the necessary paragraph count for a detailed summary and instruct the next LLM to follow that count."],
    ["user", "{input}"],
])

CHAIN = PROMPT | CHAT_MODEL | OUTPUT_PARSER

# Function to generate video summary prompt
def generate_video_summary_prompt(video_data):
    try:
        print('Generating prompt for video summary')
        input_string = f"Title: {video_data['title']}\nDescription: {video_data['description']}\nTranscript: {video_data['transcript']}"
        chat = CHAIN.invoke(f"Here is the video content please formulate a prompt to help an LLM summarize this video, I have included the transcript, title and description:\n\n{input_string}")
        print('Generated prompt for video: ', chat)
        return chat
    except Exception as e:
        print('Error generating video summary prompt:', e)
        raise

# Function to process video with LLM using generated prompt
def process_video_with_llm(generated_prompt, video_data):
    try:
        print('Processing video with LLM generated prompt')
        input_string = f"Here is the video Transcript: {video_data['transcript']}"
        chat = CHAT_MODEL(generated_prompt + "\n\n" + input_string)
        print('Processed video with LLM: ', chat)
        return chat
    except Exception as e:
        print('Error processing video with LLM:', e)
        raise