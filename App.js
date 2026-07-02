import { Provider } from 'react-redux';

import FastmarkApp from './src/FastmarkApp';
import { store } from './src/store';

export default function App() {
  return (
    <Provider store={store}>
      <FastmarkApp />
    </Provider>
  );
}
