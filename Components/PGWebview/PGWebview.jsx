import { useRef, useState } from "react";
import { Button, Text, View } from "react-native";
import WebView from "react-native-webview";

const HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>MyWebiste - ECommerce</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!--Paygreen Payement Integration-->
    <script
      defer
      type="text/javascript"
      src="https://sb-pgjs.paygreen.fr/latest/paygreen.min.js"
    ></script>
    <link
      href="https://sb-pgjs.paygreen.fr/latest/paygreen.min.css"
      type="text/css"
      rel="stylesheet"
    />
  </head>
  <body>
    <!--Paygreen-->
    <div id="paygreen-container"></div>
    <!--Paygreen-->
    <div id="paygreen-methods-container"></div>
    <div>
      <!--Paygreen-->
      <div id="paygreen-pan-frame"></div>
      <div id="paygreen-cvv-frame"></div>
      <div id="paygreen-exp-frame"></div>
    </div>
    <!--Paygreen-->
    <button id="payButton" onclick="handlePay()">Pay</button>
    <div id="paygreen-reuse-checkbox-container"></div>
  </body>
</html>
`;

// We added the new event ON_OPEN_POPUP to handle the request of opening a popup
const javascriptToInject = `
window.paygreenjs.attachEventListener(
  window.paygreenjs.Events.ON_OPEN_POPUP,
  (event) => {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        authUrl: event.detail.url
      })
    );
  }
);
window.paygreenjs.attachEventListener(
  window.paygreenjs.Events.ERROR,
  (event) => {
    window.alert(event.detail);
  }
);

window.paygreenjs.attachEventListener(
  window.paygreenjs.Events.INSTRUMENT_READY,
  (event) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({type: "INSTRUMENT_READY", detail: event.detail}))
  }
);

window.paygreenjs.attachEventListener(
  window.paygreenjs.Events.PAYMENT_FLOW_ONCHANGE,
  (event) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({type: "PAYMENT_FLOW_ONCHANGE", detail: event.detail}))
  }
);

window.paygreenjs.init({
  publicKey: 'pk_6018016627284e5d95d0e48103272a37',
  paymentOrderID: 'po_456e62b00c524fefaaeca5d1c9557a32',
  objectSecret: '4ed95608af348127',
  modeOptions: {
    authorizedInstrument: true,
  },
  mode: 'payment',
  paymentMethod: 'restoflash',
});
`;

const PGWebview = () => {
  const [initPGJS, setInitPGJS] = useState(false);
  const [instrument, setInstrument] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const mainWebViewRef = useRef();
  const authWebviewRef = useRef();

  const getInjectableJSMessage = (message) => {
    return `
      (function() {
        window.postMessage(${JSON.stringify(message)});
      })();
    `;
  };

  const handleWebViewMessage = ({ nativeEvent }) => {
    let content = null;
    if (nativeEvent?.data) {
      try {
        content = JSON.parse(nativeEvent?.data);
      } catch (e) {
        content = nativeEvent?.data;
      }

      console.log(content);

      if (content?.authUrl) {
        setAuthUrl(content?.authUrl);
      } else if (content?.type) {
        if (content?.type === "INSTRUMENT_READY") {
          setAuthUrl(null);
          setInstrument(content?.detail.instrument);
        }
        if (content?.type === "PAYMENT_FLOW_ONCHANGE") {
          if (content?.detail?.status === "success") {
            setTimeout(() => {
              setAuthUrl(null);
            }, 1000);
          }
          console.log(content?.detail);
        }
      } else {
        authWebviewRef.current.postMessage(content);
      }
    }
  };

  const handleAuthWebViewMessage = ({ nativeEvent }) => {
    let content = null;
    console.log(nativeEvent);
    if (nativeEvent?.data) {
      try {
        content = JSON.parse(nativeEvent?.data);
      } catch (e) {
        content = nativeEvent?.data;
      }
    }

    console.log(content);

    mainWebViewRef.current.injectJavaScript(
      getInjectableJSMessage(nativeEvent?.data)
    );
  };

  return (
    <View style={{ marginTop: 50 }}>
      {!initPGJS && (
        <Button
          onPress={() => setInitPGJS(true)}
          title="Pay with swile"
          color="#841584"
          accessibilityLabel="Pay with swile"
        />
      )}
      {instrument?.id && <Text>Instrument crée: {instrument?.id}</Text>}

      {initPGJS && !instrument?.id && (
        <View style={{ height: 100 }}>
          <WebView
            source={{
              html: HTML,
              baseUrl: "http://localhost",
            }}
            ref={mainWebViewRef}
            onMessage={handleWebViewMessage}
            injectedJavaScript={javascriptToInject}
            javaScriptCanOpenWindowsAutomatically={true}
            onError={(err) => {
              console.log(err);
            }}
          />
        </View>
      )}
      {authUrl && (
        <View style={{ height: 600 }}>
          <WebView
            ref={authWebviewRef}
            source={{
              uri: authUrl,
            }}
            onMessage={handleAuthWebViewMessage}
            onNavigationStateChange={(url) => {
              // We add the possibility to add this custom function in the window of the popup. If provided, we will post message with function
              authWebviewRef.current.injectJavaScript(`
            window.paygreenjsCustomPostmessage = (content) => window.ReactNativeWebView.postMessage(content);
            true;
          `);
            }}
          />
        </View>
      )}
    </View>
  );
};

export default PGWebview;
