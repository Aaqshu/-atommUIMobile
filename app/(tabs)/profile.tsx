import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LogOut, User, Settings, HelpCircle, Info } from 'lucide-react-native';
import ProfileOption from '@/components/profile/ProfileOption';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  
  const isGuest = user?.role === 'guest';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
          {isGuest ? (
            <User size={40} color={colors.primary} />
          ) : (
            <Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=' + (user?.username || 'User') }} 
              style={styles.avatar} 
            />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.username, { color: colors.text }]}>
            {user?.username || 'User'}
          </Text>
          <Text style={[styles.userType, { color: colors.textSecondary }]}>
            {isGuest ? 'Guest User' : 'Google User'}
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={[styles.optionsContainer, { backgroundColor: colors.cardBackground }]}>
          <ProfileOption 
            icon={<User size={20} color={colors.primary} />}
            title="Edit Profile"
            subtitle="Change your profile information"
            disabled={isGuest}
          />
          <ProfileOption 
            icon={<Settings size={20} color={colors.primary} />}
            title="Settings"
            subtitle="App preferences and notifications"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        <View style={[styles.optionsContainer, { backgroundColor: colors.cardBackground }]}>
          <ProfileOption 
            icon={<HelpCircle size={20} color={colors.primary} />}
            title="Help Center"
            subtitle="Get help with your account"
          />
          <ProfileOption 
            icon={<Info size={20} color={colors.primary} />}
            title="About"
            subtitle="App information and version"
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.danger }]}
        onPress={logout}
        activeOpacity={0.8}
      >
        <LogOut size={20} color="#ffffff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: 64,
    height: 64,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  userType: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 8,
  },
  optionsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});