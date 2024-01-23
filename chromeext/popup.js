document.getElementById('submitBtn').addEventListener('click', async () => {
    const textInput = document.getElementById('textInput').value;
    console.log('Text to be summarized:', textInput); // Log the pasted text

    try {
        const response = await fetch('https://org.splurt.net/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: textInput })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Summarization job submitted, article ID:', data.articleId); // Log success with article ID
            subscribeToSummary(data.articleId); // Assuming the backend returns an article ID
        } else {
            console.error('Failed to submit summarization job:', await response.text()); // Log error response
        }
    } catch (error) {
        console.error('Error submitting summarization job:', error); // Log fetch error
    }
});

function subscribeToSummary(articleId) {
    const evtSource = new EventSource(`https://org.splurt.net/summary_stream/${articleId}`);

    evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Received summary:', data.summary); // Log the summary data
        if (data.summary) {
            document.getElementById('summaryResult').textContent = data.summary;
            evtSource.close();
        }
    };

    evtSource.onerror = function(event) {
        console.error('SSE connection error:', event); // Log SSE error
        evtSource.close();
    };
}
