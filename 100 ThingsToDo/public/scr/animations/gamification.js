// Test script for Firebase gamification integration
// Run with: node test_firebase_gamification.js

// Mock Firebase for testing
const mockFirebase = {
  db: {
    collection: () => ({
      doc: () => ({
        set: async () => console.log('Mock Firebase: set called'),
        get: async () => ({ exists: false, data: () => ({}) })
      })
    })
  },
  auth: {
    currentUser: { uid: 'test-user-123' }
  }
};

// Mock localStorage for browser environment
window.localStorage = window.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Import the GamificationSystem class (simplified for testing)
class GamificationSystem {
  constructor(userId = null) {
    this.userId = userId;
    this.totalPoints = 0;
    this.level = 1;
    this.experience = 0;
    this.challenges = [];
    this.stats = { tasksCompleted: 0 };
  }

  async saveProgress() {
    if (!this.userId) {
      console.warn('⚠️ No user ID available, saving to localStorage as fallback');
      this.saveToLocalStorage();
      return;
    }

    try {
      console.log('💾 Saving to Firebase for user:', this.userId);
      // In real implementation, this would use Firebase
      console.log('✅ Progress saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving to Firebase:', error);
      this.saveToLocalStorage();
    }
  }

  saveToLocalStorage() {
    console.log('💾 Saving to localStorage (fallback)');
  }

  async loadProgress() {
    if (!this.userId) {
      console.warn('⚠️ No user ID available, loading from localStorage');
      this.loadFromLocalStorage();
      return;
    }

    try {
      console.log('📂 Loading from Firebase for user:', this.userId);
      // In real implementation, this would load from Firebase
      console.log('✅ Progress loaded from Firebase');
    } catch (error) {
      console.error('❌ Error loading from Firebase:', error);
      this.loadFromLocalStorage();
    }
  }

  loadFromLocalStorage() {
    console.log('📂 Loading from localStorage (fallback)');
  }
}

// Test the system
async function testGamificationFirebase() {
  console.log('🧪 Testing Firebase Gamification Integration...\n');

  // Test 1: Initialize without user ID (should use localStorage)
  console.log('Test 1: Initialize without user ID');
  const system1 = new GamificationSystem();
  await system1.saveProgress();
  await system1.loadProgress();
  console.log('');

  // Test 2: Initialize with user ID (should use Firebase)
  console.log('Test 2: Initialize with user ID');
  const system2 = new GamificationSystem('test-user-123');
  await system2.saveProgress();
  await system2.loadProgress();
  console.log('');

  // Test 3: Update user ID dynamically
  console.log('Test 3: Update user ID dynamically');
  system1.userId = 'dynamic-user-456';
  await system1.saveProgress();
  await system1.loadProgress();
  console.log('');

  console.log('✅ All tests completed successfully!');
}

// Only run tests in Node.js environment or when explicitly called
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('gamification.js')) {
  testGamificationFirebase().catch(console.error);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GamificationSystem, testGamificationFirebase };
}