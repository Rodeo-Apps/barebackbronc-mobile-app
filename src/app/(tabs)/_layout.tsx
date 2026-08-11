import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="draw"
        options={{
          title: "Draw",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shuffle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="compete"
        options={{
          title: "Rides",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stopwatch-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: "Body",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
