import React from "react";
import { Text, View } from "react-native";
import PGWebview from "./Components/PGWebview/PGWebview";

export default function App() {
  return (
    <View style={{ marginTop: 50 }}>
      <Text>PGJS Integration example</Text>

      <View style={{ height: 200 }}>
        <PGWebview />
      </View>
    </View>
  );
}
