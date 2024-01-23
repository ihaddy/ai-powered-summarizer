// Update the import statement to use named import
import { create } from 'zustand';

const useStore = create(set => ({
  inputText: '',
  setInputText: (input) => set({ inputText: input }),
  summary: '',
  setSummary: (summary) => set({ summary: summary }),
  loading: false,
  setLoading: (loading) => set({ loading: loading }),
}));

export default useStore;
