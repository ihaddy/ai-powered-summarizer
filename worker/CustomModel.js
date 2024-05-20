import axios from 'axios'
import 'dotenv/config'; 


class OpenRouterModel {
    constructor() {
        this.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ; // Ensure this environment variable is set
        this.YOUR_SITE_URL = 'https://openrouter.ai/api/v1/chat/completions'; // Update this as necessary
    }

    async call(systemMessage, userMessage) {
        const headers = {
            'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        };

        const data = {
            model: "nousresearch/nous-capybara-34b",
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage }
            ]
        };

        try {
            const response = await axios.post(this.YOUR_SITE_URL, data, { headers: headers });
            const output = response.data.choices[0].message.content;
            return output;
        } catch (error) {
            console.error('Error with OpenRouterModel:', error);
            throw error;
        }
    }
}

// // Usage Example
// async function testOpenRouterModel() {
//     const llm = new OpenRouterModel();
//     try {
//         const response = await llm.call("Who are you? Answer in 3 sentences.");
//         console.log(response);
//     } catch (error) {
//         console.error('Error testing Claude2LLM:', error);
//     }
// }

// testOpenRouterModel();

// module.exports = OpenRouterModel;
export default OpenRouterModel;

