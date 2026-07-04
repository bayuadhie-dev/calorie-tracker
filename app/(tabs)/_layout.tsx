import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'UTAMA',
          tabBarIcon: ({ color, focused }) => (
            <Text style={[styles.iconText, { color }]}>
              {focused ? 'O' : 'o'}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="meal-planner"
        options={{
          title: 'MAKAN',
          tabBarIcon: ({ color, focused }) => (
            <Text style={[styles.iconText, { color }]}>
              {focused ? 'F' : 'f'}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'RIWAYAT',
          tabBarIcon: ({ color, focused }) => (
            <Text style={[styles.iconText, { color }]}>
              {focused ? 'H' : 'h'}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'PENGATURAN',
          tabBarIcon: ({ color, focused }) => (
            <Text style={[styles.iconText, { color }]}>
              {focused ? 'S' : 's'}
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    marginBottom: 4,
  },
});
