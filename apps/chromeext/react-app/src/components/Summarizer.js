import { Box, Button, CircularProgress, Container, TextareaAutosize } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import useStore from '../summarizerstore';
import { BASE_URL } from '../buildvars';
import useHttp from '../useHttp'; // Adjust the path as needed

function Summarizer() {
  const { inputText, setInputText, summary, setSummary, setLoading } = useStore();
  const [timeoutId, setTimeoutId] = useState(null);
  const { isLoading, error, sendRequest } = useHttp();

  const fetchSummarize = async (textInput) => {
    return sendRequest({
      url: '/summarize',
      method: 'POST',
      body: { content: textInput },
    });
  };

  const handleSummarize = async () => {
    setLoading(true);
    setSummary('');

    try {
      const data = await fetchSummarize(inputText);
      subscribeToSummary(data.articleId);
    } catch (error) {
      console.error('Error submitting summarization job:', error);
      setLoading(false);
    }

    // Set a timeout to reset the button
    const newTimeoutId = setTimeout(() => {
      setLoading(false);
    }, 60000); // 60 seconds
    setTimeoutId(newTimeoutId);
  };

  const subscribeToSummary = useCallback((articleId) => {
    const evtSource = new EventSource(`${BASE_URL}/summary_stream/${articleId}`);
    evtSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      if (data.summary) {
        setSummary(data.summary);
        setLoading(false);
        clearTimeout(timeoutId);
        evtSource.close();
      }
    };
    evtSource.onerror = function(event) {
      console.error('SSE connection error:', event);
      setLoading(false);
      clearTimeout(timeoutId);
      evtSource.close();
    };
  }, [timeoutId]);

  // Clear timeout on unmount to avoid memory leaks
  useEffect(() => {
    return () => clearTimeout(timeoutId);
  }, [timeoutId]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box component="h1" mb={4}>
        Text Summarizer
      </Box>
      <TextareaAutosize
        minRows={6}
        placeholder="Paste text here..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        style={{ width: '100%', padding: '8px' }}
      />
      <Box display="flex" justifyContent="center" my={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSummarize}
          disabled={isLoading}
          startIcon={isLoading && <CircularProgress size={24} />}
        >
          {isLoading ? 'Loading...' : 'Summarize'}
        </Button>
      </Box>
      <Box
        p={3}
        bgcolor="background.paper"
        border={1}
        borderColor="grey.300"
        mt={3}
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      >
        {summary || 'Your summarized text will appear here...'}
      </Box>
    </Container>
  );
}

export default Summarizer;