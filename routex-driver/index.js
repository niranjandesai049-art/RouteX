import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './package.json';

// Register background handler for Firebase Messaging
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(
    'Firebase message received in background/terminated state:',
    remoteMessage,
  );
});

AppRegistry.registerComponent(appName, () => App);
