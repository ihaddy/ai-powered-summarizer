import { Box, Button, CircularProgress, Container, TextareaAutosize } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import useStore from '../summarizerstore';
import { BASE_URL } from '../buildvars';

function Summarizer() {

    const { inputText, setInputText, summary, setSummary, loading, setLoading } = useStore();

    const [timeoutId, setTimeoutId] = useState(null);
    const queryClient = useQueryClient();
  
    const fetchSummarize = async (textInput) => {
      const response = await fetch(`${BASE_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textInBput }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    };
  
    const summarizeMutation = useMutation({
      mutationFn: fetchSummarize,
      onError: (error) => {
        console.error('Error submitting summarization job:', error);
        setLoading(false);
      },
      onSuccess: (data) => {
        subscribeToSummary(data.articleId);
      }
    });
  
    const handleSummarize = () => {
      setLoading(true);
      setSummary('');
      summarizeMutation.mutate(inputText);
  
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
            disabled={loading}
            startIcon={loading && <CircularProgress size={24} />}
          >
            {loading ? 'Loading...' : 'Summarize'}
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