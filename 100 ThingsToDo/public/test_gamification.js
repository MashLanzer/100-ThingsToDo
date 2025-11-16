// Test script for gamification system
const fs = require('fs');

// Read the app.js file
const appContent = fs.readFileSync('app.js', 'utf8');

// Test 1: Check if GamificationSystem class exists
console.log('=== GAMIFICATION SYSTEM TESTS ===\n');

const tests = [
  {
    name: 'GamificationSystem class',
    check: 'class GamificationSystem',
    description: 'Main gamification system class'
  },
  {
    name: 'RewardsSystem class',
    check: 'class RewardsSystem',
    description: 'Rewards and purchases system'
  },
  {
    name: 'Points earning',
    check: 'earnPoints',
    description: 'Points earning method'
  },
  {
    name: 'Level system',
    check: 'checkLevelUp',
    description: 'Level progression system'
  },
  {
    name: 'Multipliers',
    check: 'getTotalMultiplier',
    description: 'Dynamic multiplier system'
  },
  {
    name: 'Gamification dashboard UI',
    check: 'showGamificationDashboard',
    description: 'Dashboard display function'
  },
  {
    name: 'Rewards store UI',
    check: 'showRewardsStore',
    description: 'Rewards store interface'
  },
  {
    name: 'Challenges board UI',
    check: 'showChallengesBoard',
    description: 'Challenges interface'
  },
  {
    name: 'Task completion integration',
    check: 'integrateTaskCompletion',
    description: 'Task completion handler'
  },
  {
    name: 'Badge unlock system',
    check: 'checkBadgeUnlock',
    description: 'Badge unlock handler'
  },
  {
    name: 'Points persistence',
    check: 'saveProgress',
    description: 'Data persistence method'
  },
  {
    name: 'Points loading',
    check: 'loadProgress',
    description: 'Data loading method'
  }
];

let passedTests = 0;
let failedTests = 0;

tests.forEach(test => {
  if (appContent.includes(test.check)) {
    console.log(`✅ ${test.name}: ${test.description}`);
    passedTests++;
  } else {
    console.log(`❌ ${test.name}: ${test.description} - NOT FOUND`);
    failedTests++;
  }
});

console.log(`\n=== TEST RESULTS ===`);
console.log(`Passed: ${passedTests}/${tests.length}`);
console.log(`Failed: ${failedTests}/${tests.length}`);

if (failedTests === 0) {
  console.log('\n🎉 ALL GAMIFICATION COMPONENTS FOUND SUCCESSFULLY!');
  console.log('\nNext steps:');
  console.log('1. Open the app in browser at http://localhost:8000');
  console.log('2. Click the star/trophy button to open gamification dashboard');
  console.log('3. Test points earning by completing tasks');
  console.log('4. Test rewards store and challenges board');
  console.log('5. Verify level progression and achievements');
} else {
  console.log('\n⚠️  Some components are missing. Please check the implementation.');
}

// Test 2: Check CSS styling
console.log('\n=== CSS STYLING TESTS ===\n');

// Read both CSS files
const mainCssContent = fs.readFileSync('styles.css', 'utf8');
const gamificationCssContent = fs.readFileSync('gamification.css', 'utf8');
const cssContent = mainCssContent + '\n' + gamificationCssContent;

const cssTests = [
  {
    name: 'Gamification dashboard modal',
    check: 'gamification-modal',
    description: 'Dashboard modal styling'
  },
  {
    name: 'Rewards store modal',
    check: 'rewards-store',
    description: 'Rewards store styling'
  },
  {
    name: 'Challenges board modal',
    check: 'challenges-board',
    description: 'Challenges board styling'
  },
  {
    name: 'Stats cards',
    check: 'stat-card',
    description: 'Statistics cards styling'
  },
  {
    name: 'Progress bars',
    check: 'progress-bar',
    description: 'Progress indicators'
  },
  {
    name: 'Reward themes',
    check: 'reward-item',
    description: 'Reward theme styling'
  },
  {
    name: 'Challenge cards',
    check: 'challenge-item',
    description: 'Challenge card styling'
  }
];

let cssPassed = 0;
let cssFailed = 0;

cssTests.forEach(test => {
  if (cssContent.includes(test.check)) {
    console.log(`✅ ${test.name}: ${test.description}`);
    cssPassed++;
  } else {
    console.log(`❌ ${test.name}: ${test.description} - NOT FOUND`);
    cssFailed++;
  }
});

console.log(`\n=== CSS TEST RESULTS ===`);
console.log(`Passed: ${cssPassed}/${cssTests.length}`);
console.log(`Failed: ${cssFailed}/${cssTests.length}`);

// Test 3: Check HTML integration
console.log('\n=== HTML INTEGRATION TESTS ===\n');

const htmlContent = fs.readFileSync('index.html', 'utf8');

const htmlTests = [
  {
    name: 'Gamification button',
    check: 'gamification-btn',
    description: 'Button to open gamification dashboard'
  },
  {
    name: 'Star/trophy icon',
    check: '⭐',
    description: 'Gamification icon in button'
  }
];

let htmlPassed = 0;
let htmlFailed = 0;

htmlTests.forEach(test => {
  if (htmlContent.includes(test.check)) {
    console.log(`✅ ${test.name}: ${test.description}`);
    htmlPassed++;
  } else {
    console.log(`❌ ${test.name}: ${test.description} - NOT FOUND`);
    htmlFailed++;
  }
});

console.log(`\n=== HTML TEST RESULTS ===`);
console.log(`Passed: ${htmlPassed}/${htmlTests.length}`);
console.log(`Failed: ${htmlFailed}/${htmlTests.length}`);

console.log('\n=== FINAL SUMMARY ===');
const totalPassed = passedTests + cssPassed + htmlPassed;
const totalTests = tests.length + cssTests.length + htmlTests.length;
console.log(`Overall: ${totalPassed}/${totalTests} tests passed`);

if (totalPassed === totalTests) {
  console.log('\n🚀 GAMIFICATION SYSTEM IS READY FOR TESTING!');
  console.log('\nManual testing checklist:');
  console.log('□ Open app and click gamification button');
  console.log('□ Check dashboard shows current stats');
  console.log('□ Complete a task and verify points earned');
  console.log('□ Check level progression');
  console.log('□ Browse rewards store');
  console.log('□ View available challenges');
  console.log('□ Test responsive design on mobile');
} else {
  console.log('\n⚠️  Some components need attention before testing.');
}