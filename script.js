// WellnessTrack Pro - Complete JavaScript Implementation
(() => {
    'use strict';

    // ========== App State ==========
    let users = {
        'demo@company.com': {
            name: 'Demo User',
            email: 'demo@company.com',
            password: 'demo123',
            department: 'Demo Department',
            dailyData: {}
        }
    };
    let currentUser = null;
    let formData = {};
    let currentStep = 1;
    let totalSteps = 5;
    let ratings = {};

    // ========== Utility Functions ==========
    const safe = (id) => document.getElementById(id);
    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
    const todayKey = (d = new Date()) => d.toDateString();

    // ========== Background Animation ==========
    function createFloatingTerms() {
        const terms = [
            'FITNESS', 'WELLNESS', 'HEALTH', 'ENERGY', 'HYDRATION',
            'SLEEP', 'ACTIVITY', 'GOALS', 'PROGRESS', 'VITALITY',
            'STRENGTH', 'BALANCE', 'MINDFUL', 'ACTIVE', 'STRONG'
        ];
        
        const container = safe('terms-container');
        if (!container) return;

        function addTerm() {
            const term = document.createElement('div');
            term.className = 'floating-term';
            term.textContent = terms[Math.floor(Math.random() * terms.length)];
            term.style.left = Math.random() * 100 + '%';
            term.style.animationDuration = (8 + Math.random() * 4) + 's';
            container.appendChild(term);

            setTimeout(() => {
                if (term.parentNode) {
                    term.parentNode.removeChild(term);
                }
            }, 12000);
        }

        // Add initial terms
        for (let i = 0; i < 5; i++) {
            setTimeout(addTerm, i * 2000);
        }

        // Continue adding terms
        setInterval(addTerm, 3000);
    }

    // ========== Authentication Functions ==========
    function showMessage(message, type = 'success') {
        // Remove existing messages
        document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;
        
        const authForm = document.querySelector('.auth-form:not([style*="display: none"])');
        if (authForm) {
            authForm.insertBefore(messageDiv, authForm.firstChild);
            setTimeout(() => messageDiv.remove(), 3000);
        }
    }

    function handleLogin(event) {
        event.preventDefault();
        const email = safe('login-email').value.trim();
        const password = safe('login-password').value;

        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        const user = users[email];
        if (!user || user.password !== password) {
            showMessage('Invalid email or password', 'error');
            return;
        }

        currentUser = user;
        showMessage('Login successful!', 'success');
        setTimeout(() => {
            showDashboard();
        }, 1000);
    }

    function handleSignup(event) {
        event.preventDefault();
        const name = safe('signup-name').value.trim();
        const email = safe('signup-email').value.trim();
        const password = safe('signup-password').value;
        const department = safe('signup-department').value.trim();

        if (!name || !email || !password || !department) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (users[email]) {
            showMessage('An account with this email already exists', 'error');
            return;
        }

        users[email] = {
            name,
            email,
            password,
            department,
            dailyData: {}
        };

        showMessage('Account created successfully!', 'success');
        setTimeout(() => {
            toggleForm();
        }, 1500);
    }

    function toggleForm() {
        const loginForm = safe('login-form');
        const signupForm = safe('signup-form');
        
        if (loginForm.style.display === 'none') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    }

    function showDashboard() {
        safe('auth-container').style.display = 'none';
        safe('dashboard').classList.add('active');
        updateDashboardData();
        initializeRatingSystem();
    }

    function logout() {
        currentUser = null;
        resetCheckin();
        safe('dashboard').classList.remove('active');
        safe('auth-container').style.display = 'flex';
        
        // Clear forms
        document.querySelectorAll('input').forEach(input => input.value = '');
        
        // Close mobile menu if open
        safe('sidebar').classList.remove('mobile-open');
        document.querySelector('.mobile-overlay')?.remove();
    }

    // ========== Data Processing Functions ==========
    function getUserDataArray() {
        if (!currentUser || !currentUser.dailyData) return [];
        return Object.entries(currentUser.dailyData)
            .map(([dateStr, data]) => ({
                dateStr,
                date: new Date(dateStr),
                steps: toNum(data.steps),
                calories: toNum(data.calories),
                sleep: toNum(data.sleep),
                water: toNum(data.water),
                score: toNum(data.score),
                sleepRating: toNum(data.sleepRating),
                hydrationRating: toNum(data.hydrationRating),
                energyRating: toNum(data.energyRating)
            }))
            .sort((a, b) => b.date - a.date);
    }

    function computeCurrentStreak() {
        const arr = getUserDataArray();
        if (!arr.length) return 0;
        
        const dateSet = new Set(arr.map(a => a.dateStr));
        let streak = 0;
        let day = new Date();
        
        while (true) {
            if (dateSet.has(todayKey(day))) {
                streak++;
                day.setDate(day.getDate() - 1);
            } else break;
        }
        return streak;
    }

    function mean(values) {
        const arr = values.filter(v => v != null && !Number.isNaN(v) && v > 0);
        if (!arr.length) return 0;
        return arr.reduce((s, x) => s + x, 0) / arr.length;
    }

    function calculateWellnessScore(data) {
        let score = 0;
        let factors = 0;

        // Steps (0-30 points)
        if (data.steps > 0) {
            score += Math.min(30, (data.steps / 10000) * 30);
            factors++;
        }

        // Sleep (0-25 points)
        if (data.sleep > 0) {
            const sleepScore = data.sleep >= 7 && data.sleep <= 9 ? 25 : Math.max(0, 25 - Math.abs(8 - data.sleep) * 3);
            score += sleepScore;
            factors++;
        }

        // Water (0-20 points)
        if (data.water > 0) {
            score += Math.min(20, (data.water / 2.5) * 20);
            factors++;
        }

        // Ratings (0-25 points)
        if (data.sleepRating && data.hydrationRating && data.energyRating) {
            const avgRating = (data.sleepRating + data.hydrationRating + data.energyRating) / 3;
            score += (avgRating / 5) * 25;
            factors++;
        }

        return factors > 0 ? Math.round(score / factors * 4) : 0; // Scale to 100
    }

    // ========== Step Navigation Functions ==========
    function updateStepIndicator() {
        document.querySelectorAll('.step-item').forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.remove('active', 'completed');
            
            if (stepNum < currentStep) {
                item.classList.add('completed');
            } else if (stepNum === currentStep) {
                item.classList.add('active');
            }
        });
    }

    function updateButtons() {
        const prev = safe('prev-btn');
        const next = safe('next-btn');
        const submit = safe('submit-btn');
        
        if (prev) prev.style.display = currentStep > 1 ? 'inline-block' : 'none';
        if (next) next.style.display = currentStep === totalSteps ? 'none' : 'inline-block';
        if (submit) submit.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    }

    function validateCurrentStep() {
        let valid = true;
        let msg = '';
        
        switch(currentStep) {
            case 1:
                const steps = toNum(safe('daily-steps')?.value);
                const calories = toNum(safe('daily-calories')?.value);
                if (steps === 0 && calories === 0) {
                    valid = false;
                    msg = 'Please enter at least your steps or calories burned';
                }
                break;
            case 2:
                const sleep = toNum(safe('daily-sleep')?.value);
                if (sleep <= 0 || sleep > 24) {
                    valid = false;
                    msg = 'Please enter valid sleep hours (0.5-24)';
                }
                if (!ratings['sleep-quality']) {
                    valid = false;
                    msg = 'Please rate your sleep quality';
                }
                break;
            case 3:
                const water = toNum(safe('daily-water')?.value);
                if (water <= 0) {
                    valid = false;
                    msg = 'Please enter your water intake';
                }
                if (!ratings['hydration-level']) {
                    valid = false;
                    msg = 'Please rate your hydration level';
                }
                break;
            case 4:
                if (!ratings['energy-level']) {
                    valid = false;
                    msg = 'Please rate your energy level';
                }
                break;
        }
        
        if (!valid) {
            showMessage(msg, 'error');
        }
        return valid;
    }

    function nextStep() {
        if (!validateCurrentStep()) return;
        
        if (currentStep < totalSteps) {
            // Hide current step
            safe(`step-${currentStep}`).classList.remove('active');
            
            currentStep++;
            
            // Show next step
            safe(`step-${currentStep}`).classList.add('active');
            
            // Update UI
            updateButtons();
            updateStepIndicator();
            
            if (currentStep === 5) {
                updateReviewData();
            }
        }
    }

    function previousStep() {
        if (currentStep > 1) {
            // Hide current step
            safe(`step-${currentStep}`).classList.remove('active');
            
            currentStep--;
            
            // Show previous step
            safe(`step-${currentStep}`).classList.add('active');
            
            // Update UI
            updateButtons();
            updateStepIndicator();
        }
    }

    function updateReviewData() {
        const steps = toNum(safe('daily-steps')?.value);
        const calories = toNum(safe('daily-calories')?.value);
        const sleep = toNum(safe('daily-sleep')?.value);
        const water = toNum(safe('daily-water')?.value);

        safe('review-steps').textContent = steps.toLocaleString();
        safe('review-calories').textContent = calories.toLocaleString();
        safe('review-sleep').textContent = sleep;
        safe('review-water').textContent = water;

        // Update ratings
        safe('review-sleep-rating').textContent = '★'.repeat(ratings['sleep-quality'] || 0);
        safe('review-hydration-rating').textContent = '★'.repeat(ratings['hydration-level'] || 0);
        safe('review-energy-rating').textContent = '★'.repeat(ratings['energy-level'] || 0);
    }

    function submitDailyData() {
        if (!validateCurrentStep()) return;

        const today = todayKey();
        const data = {
            steps: toNum(safe('daily-steps')?.value),
            calories: toNum(safe('daily-calories')?.value),
            sleep: toNum(safe('daily-sleep')?.value),
            water: toNum(safe('daily-water')?.value),
            sleepRating: ratings['sleep-quality'] || 0,
            hydrationRating: ratings['hydration-level'] || 0,
            energyRating: ratings['energy-level'] || 0,
            date: today
        };

        data.score = calculateWellnessScore(data);

        // Save data
        if (!currentUser.dailyData) {
            currentUser.dailyData = {};
        }
        currentUser.dailyData[today] = data;

        // Show results
        showResults(data);
        updateDashboardData();
    }

    function showResults(data) {
        const score = data.score;
        const scoreEl = safe('energy-score');
        const descEl = safe('energy-description');
        
        if (scoreEl) scoreEl.textContent = score + '%';
        
        if (descEl) {
            if (score >= 90) {
                descEl.textContent = 'Excellent! You\'re crushing your wellness goals! 🔥';
            } else if (score >= 75) {
                descEl.textContent = 'Great job! You\'re doing really well! 💪';
            } else if (score >= 60) {
                descEl.textContent = 'Good progress! Keep building those healthy habits! 👍';
            } else if (score >= 40) {
                descEl.textContent = 'You\'re on the right track! Small improvements make a big difference! 🌱';
            } else {
                descEl.textContent = 'Every step counts! Let\'s work on building better habits together! 💚';
            }
        }

        // Update final display
        safe('final-steps').textContent = data.steps.toLocaleString();
        safe('final-calories').textContent = data.calories.toLocaleString();
        safe('final-sleep').textContent = data.sleep;
        safe('final-water').textContent = data.water;
        safe('final-sleep-rating').textContent = '★'.repeat(data.sleepRating);
        safe('final-hydration-rating').textContent = '★'.repeat(data.hydrationRating);
        safe('final-energy-rating').textContent = '★'.repeat(data.energyRating);

        // Hide form and show results
        document.querySelector('.step-form-card').style.display = 'none';
        safe('results-summary').style.display = 'block';
    }

    function resetCheckin() {
        currentStep = 1;
        ratings = {};
        formData = {};

        // Reset form visibility
        document.querySelector('.step-form-card').style.display = 'block';
        safe('results-summary').style.display = 'none';

        // Reset steps
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index === 0);
        });

        // Reset inputs
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');

        // Reset ratings
        document.querySelectorAll('.star').forEach(star => {
            star.classList.remove('active');
            star.style.color = '#e5e7eb';
        });

        // Reset descriptions
        document.querySelectorAll('.rating-description').forEach(desc => {
            if (desc.id.includes('sleep')) {
                desc.textContent = 'Click stars to rate your sleep quality';
            } else if (desc.id.includes('hydration')) {
                desc.textContent = 'Click stars to rate how hydrated you feel';
            } else if (desc.id.includes('energy')) {
                desc.textContent = 'Click stars to rate your energy level';
            }
        });

        updateButtons();
        updateStepIndicator();
    }

    // ========== Rating System ==========
    function initializeRatingSystem() {
        document.querySelectorAll('.rating-stars').forEach(container => {
            const stars = container.querySelectorAll('.star');
            const ratingType = container.dataset.rating;
            
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    const value = parseInt(star.dataset.value);
                    ratings[ratingType] = value;
                    
                    // Update star display
                    stars.forEach((s, i) => {
                        s.classList.toggle('active', i < value);
                        s.style.color = i < value ? '#fbbf24' : '#e5e7eb';
                    });
                    
                    // Update description
                    updateRatingDescription(ratingType, value);
                });
                
                star.addEventListener('mouseenter', () => {
                    const value = parseInt(star.dataset.value);
                    stars.forEach((s, i) => {
                        s.style.color = i < value ? '#fbbf24' : '#e5e7eb';
                    });
                });
                
                container.addEventListener('mouseleave', () => {
                    const currentRating = ratings[ratingType] || 0;
                    stars.forEach((s, i) => {
                        s.style.color = i < currentRating ? '#fbbf24' : '#e5e7eb';
                    });
                });
            });
        });
    }

    function updateRatingDescription(type, value) {
        const descriptions = {
            'sleep-quality': {
                1: 'Very poor sleep - tossed and turned all night',
                2: 'Poor sleep - woke up multiple times',
                3: 'Fair sleep - decent rest but could be better',
                4: 'Good sleep - woke up refreshed',
                5: 'Excellent sleep - perfect night of rest!'
            },
            'hydration-level': {
                1: 'Very dehydrated - need more water',
                2: 'Slightly dehydrated - could drink more',
                3: 'Adequately hydrated - maintaining balance',
                4: 'Well hydrated - feeling good',
                5: 'Perfectly hydrated - optimal levels!'
            },
            'energy-level': {
                1: 'Very low energy - feeling drained',
                2: 'Low energy - struggling to stay alert',
                3: 'Moderate energy - getting through the day',
                4: 'High energy - feeling great and productive',
                5: 'Peak energy - unstoppable and focused!'
            }
        };
        
        const descElement = safe(`${type}-rating-desc`);
        if (descElement && descriptions[type] && descriptions[type][value]) {
            descElement.textContent = descriptions[type][value];
        }
    }

    // ========== Navigation Functions ==========
    function showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-section').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected page
        const targetPage = safe(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Add active class to current nav item
        const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Close mobile menu
        closeMobileMenu();

        // Update page-specific data
        updatePageData(pageId);
    }

    function updatePageData(pageId) {
        const dataArray = getUserDataArray();
        
        switch(pageId) {
            case 'activity-tracking':
                updateActivityTrackingData(dataArray);
                break;
            case 'hydration-monitoring':
                updateHydrationMonitoringData(dataArray);
                break;
            case 'sleep-assessment':
                updateSleepAssessmentData(dataArray);
                break;
            case 'energy-analysis':
                updateEnergyAnalysisData(dataArray);
                break;
            case 'personalized-goals':
                updatePersonalizedGoalsData(dataArray);
                break;
            case 'progress-analytics':
                updateProgressAnalyticsData(dataArray);
                break;
        }
    }

    // ========== Page-specific Data Updates ==========
    function updateActivityTrackingData(dataArray) {
        const avgSteps = mean(dataArray.map(d => d.steps));
        const weeklyCalories = dataArray.slice(0, 7).reduce((sum, d) => sum + d.calories, 0);
        const activeDays = dataArray.filter(d => d.steps > 5000).length;

        safe('avg-steps').textContent = avgSteps > 0 ? Math.round(avgSteps).toLocaleString() : '--';
        safe('total-calories').textContent = weeklyCalories > 0 ? weeklyCalories.toLocaleString() : '--';
        safe('active-days').textContent = activeDays > 0 ? activeDays : '--';

        // Create simple chart
        if (dataArray.length > 0) {
            createSimpleChart('activity-chart', dataArray.slice(0, 7).reverse(), 'steps', 'Steps');
        }
    }

    function updateHydrationMonitoringData(dataArray) {
        const avgWater = mean(dataArray.map(d => d.water));
        const streak = dataArray.filter(d => d.water >= 2.5).length;

        safe('avg-water').textContent = avgWater > 0 ? avgWater.toFixed(1) + 'L' : '--';
        safe('hydration-streak').textContent = streak > 0 ? streak + ' days' : '--';

        if (dataArray.length > 0) {
            createSimpleChart('hydration-chart', dataArray.slice(0, 7).reverse(), 'water', 'Water (L)');
        }
    }

    function updateSleepAssessmentData(dataArray) {
        const avgSleep = mean(dataArray.map(d => d.sleep));
        const avgQuality = mean(dataArray.map(d => d.sleepRating));
        const consistency = dataArray.length > 1 ? 
            Math.max(0, 100 - (dataArray.map(d => d.sleep).reduce((acc, val, i, arr) => 
                i > 0 ? acc + Math.abs(val - arr[i-1]) : acc, 0) / (dataArray.length - 1)) * 10) : 0;

        safe('avg-sleep').textContent = avgSleep > 0 ? avgSleep.toFixed(1) + 'h' : '--';
        safe('sleep-quality').textContent = avgQuality > 0 ? avgQuality.toFixed(1) + '/5' : '--';
        safe('sleep-consistency').textContent = consistency > 0 ? Math.round(consistency) + '%' : '--';

        if (dataArray.length > 0) {
            createSimpleChart('sleep-chart', dataArray.slice(0, 7).reverse(), 'sleep', 'Sleep (h)');
        }
    }

    function updateEnergyAnalysisData(dataArray) {
        const avgEnergy = mean(dataArray.map(d => d.energyRating));
        const peakDay = dataArray.length > 0 ? 
            dataArray.reduce((max, d) => d.energyRating > max.energyRating ? d : max).date.toLocaleDateString() : '--';
        const trend = dataArray.length >= 2 ? 
            (dataArray[0].energyRating - dataArray[1].energyRating) > 0 ? '📈 Up' : '📉 Down' : '--';

        safe('avg-energy').textContent = avgEnergy > 0 ? avgEnergy.toFixed(1) + '/5' : '--';
        safe('peak-energy').textContent = peakDay;
        safe('energy-trend').textContent = trend;

        if (dataArray.length > 0) {
            createSimpleChart('energy-chart', dataArray.slice(0, 7).reverse(), 'energyRating', 'Energy Level');
        }
    }

    function updatePersonalizedGoalsData(dataArray) {
        if (dataArray.length === 0) return;

        const latest = dataArray[0];
        
        // Calculate progress percentages
        const stepsProgress = Math.min(100, (latest.steps / 10000) * 100);
        const waterProgress = Math.min(100, (latest.water / 2.5) * 100);
        const sleepProgress = latest.sleep >= 7 && latest.sleep <= 9 ? 100 : 
            Math.max(0, 100 - Math.abs(8 - latest.sleep) * 12.5);
        const caloriesProgress = latest.calories >= 2000 && latest.calories <= 2500 ? 100 :
            Math.max(0, 100 - Math.abs(2250 - latest.calories) / 25);

        // Update progress bars
        safe('steps-goal-progress').style.width = stepsProgress + '%';
        safe('water-goal-progress').style.width = waterProgress + '%';
        safe('sleep-goal-progress').style.width = sleepProgress + '%';
        safe('calories-goal-progress').style.width = caloriesProgress + '%';
    }

    function updateProgressAnalyticsData(dataArray) {
        const totalCheckins = dataArray.length;
        const currentStreak = computeCurrentStreak();
        const overallScore = mean(dataArray.map(d => d.score));

        safe('total-checkins').textContent = totalCheckins > 0 ? totalCheckins : '--';
        safe('current-streak').textContent = currentStreak > 0 ? currentStreak + ' days' : '--';
        safe('overall-score').textContent = overallScore > 0 ? Math.round(overallScore) + '%' : '--';

        // Update achievements
        updateAchievements(dataArray);

        if (dataArray.length > 0) {
            createSimpleChart('analytics-chart', dataArray.slice(0, 14).reverse(), 'score', 'Wellness Score');
        }
    }

    function updateAchievements(dataArray) {
        const achievementsEl = safe('achievements');
        if (!achievementsEl || dataArray.length === 0) return;

        const achievements = [];
        
        // Check for various achievements
        if (dataArray.length >= 7) {
            achievements.push('🗓️ Week Warrior - 7 check-ins completed!');
        }
        if (dataArray.length >= 30) {
            achievements.push('📅 Monthly Master - 30 check-ins completed!');
        }
        if (computeCurrentStreak() >= 5) {
            achievements.push('🔥 Streak Star - 5 days in a row!');
        }
        if (dataArray.some(d => d.steps >= 10000)) {
            achievements.push('👟 Step Champion - 10,000 steps in a day!');
        }
        if (dataArray.some(d => d.water >= 3)) {
            achievements.push('💧 Hydration Hero - 3L water in a day!');
        }
        if (dataArray.some(d => d.score >= 90)) {
            achievements.push('⭐ Wellness Warrior - 90%+ wellness score!');
        }

        if (achievements.length > 0) {
            achievementsEl.innerHTML = achievements
                .map(achievement => `<div class="achievement-badge">${achievement}</div>`)
                .join('');
        } else {
            achievementsEl.innerHTML = 'Complete your daily check-ins to unlock achievements! 🏆';
        }
    }

    // ========== Chart Creation ==========
    function createSimpleChart(containerId, data, field, label) {
        const container = safe(containerId);
        if (!container || data.length === 0) return;

        const maxValue = Math.max(...data.map(d => d[field]));
        const minValue = Math.min(...data.map(d => d[field]));
        const range = maxValue - minValue || 1;

        const chartHTML = `
            <div class="simple-chart">
                ${data.map((d, i) => {
                    const height = Math.max(20, ((d[field] - minValue) / range) * 160 + 20);
                    const date = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `
                        <div class="chart-bar" style="height: ${height}px;">
                            <div class="chart-bar-value">${field === 'water' ? d[field].toFixed(1) : Math.round(d[field])}</div>
                            <div class="chart-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = chartHTML;
    }

    // ========== Dashboard Data Updates ==========
    function updateDashboardData() {
        const dataArray = getUserDataArray();
        
        // Update all page data
        updateActivityTrackingData(dataArray);
        updateHydrationMonitoringData(dataArray);
        updateSleepAssessmentData(dataArray);
        updateEnergyAnalysisData(dataArray);
        updatePersonalizedGoalsData(dataArray);
        updateProgressAnalyticsData(dataArray);
    }

    // ========== Mobile Menu Functions ==========
    function toggleMobileMenu() {
        const sidebar = safe('sidebar');
        const overlay = document.querySelector('.mobile-overlay') || createMobileOverlay();
        
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
    }

    function createMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.addEventListener('click', closeMobileMenu);
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeMobileMenu() {
        safe('sidebar').classList.remove('mobile-open');
        const overlay = document.querySelector('.mobile-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // ========== Event Listeners Setup ==========
    function setupEventListeners() {
        // Authentication forms
        const loginForm = safe('login-form-element');
        const signupForm = safe('signup-form-element');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }

        // Form toggle links
        const showSignupLink = safe('show-signup');
        const showLoginLink = safe('show-login');
        
        if (showSignupLink) {
            showSignupLink.addEventListener('click', toggleForm);
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', toggleForm);
        }

        // Step navigation buttons
        const prevBtn = safe('prev-btn');
        const nextBtn = safe('next-btn');
        const submitBtn = safe('submit-btn');
        const newCheckinBtn = safe('new-checkin-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', previousStep);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', nextStep);
        }
        
        if (submitBtn) {
            submitBtn.addEventListener('click', submitDailyData);
        }
        
        if (newCheckinBtn) {
            newCheckinBtn.addEventListener('click', resetCheckin);
        }

        // Logout button
        const logoutBtn = safe('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.dataset.page;
                if (pageId) {
                    showPage(pageId);
                }
            });
        });

        // Mobile menu toggle
        const mobileToggle = safe('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', toggleMobileMenu);
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (safe('dashboard').classList.contains('active')) {
                if (e.key === 'ArrowRight' || e.key === 'Enter') {
                    if (currentStep < totalSteps && safe('next-btn').style.display !== 'none') {
                        nextStep();
                    } else if (currentStep === totalSteps && safe('submit-btn').style.display !== 'none') {
                        submitDailyData();
                    }
                } else if (e.key === 'ArrowLeft') {
                    if (currentStep > 1) {
                        previousStep();
                    }
                }
            }
        });
    }

    // ========== Sample Data Generation ==========
    function generateSampleData() {
        if (!currentUser || Object.keys(currentUser.dailyData).length > 0) return;

        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = todayKey(date);

            const sampleData = {
                steps: Math.floor(Math.random() * 5000) + 6000,
                calories: Math.floor(Math.random() * 800) + 1800,
                sleep: Math.random() * 2 + 6.5,
                water: Math.random() * 1.5 + 1.5,
                sleepRating: Math.floor(Math.random() * 3) + 3,
                hydrationRating: Math.floor(Math.random() * 3) + 3,
                energyRating: Math.floor(Math.random() * 3) + 3,
                date: dateKey
            };

            sampleData.score = calculateWellnessScore(sampleData);
            currentUser.dailyData[dateKey] = sampleData;
        }
    }

    // ========== Auto-fill Demo Data ==========
    function fillDemoData() {
        if (currentUser && currentUser.email === 'demo@company.com') {
            // Auto-fill with realistic demo values
            setTimeout(() => {
                const stepsInput = safe('daily-steps');
                const caloriesInput = safe('daily-calories');
                const sleepInput = safe('daily-sleep');
                const waterInput = safe('daily-water');

                if (stepsInput && !stepsInput.value) {
                    stepsInput.value = '8500';
                }
                if (caloriesInput && !caloriesInput.value) {
                    caloriesInput.value = '2200';
                }
                if (sleepInput && !sleepInput.value) {
                    sleepInput.value = '7.5';
                }
                if (waterInput && !waterInput.value) {
                    waterInput.value = '2.3';
                }
            }, 500);
        }
    }

    // ========== Initialization ==========
    function init() {
        console.log('WellnessTrack Pro initializing...');
        
        // Setup all event listeners
        setupEventListeners();
        
        // Initialize background animation
        createFloatingTerms();
        
        // Initialize button states
        updateButtons();
        updateStepIndicator();
        
        // Check for demo user auto-login (for development)
        if (window.location.search.includes('demo')) {
            safe('login-email').value = 'demo@company.com';
            safe('login-password').value = 'demo123';
        }

        console.log('WellnessTrack Pro initialized successfully!');
    }

    // ========== Auto-login for Demo ==========
    function setupDemoMode() {
        // Generate sample data for demo user
        if (users['demo@company.com']) {
            const demoUser = users['demo@company.com'];
            if (Object.keys(demoUser.dailyData).length === 0) {
                // Create sample data for the past 2 weeks
                const today = new Date();
                for (let i = 0; i < 14; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateKey = todayKey(date);

                    const sampleData = {
                        steps: Math.floor(Math.random() * 4000) + 7000 + (i < 7 ? 1000 : 0), // Recent week better
                        calories: Math.floor(Math.random() * 600) + 2000,
                        sleep: (Math.random() * 2 + 7).toFixed(1),
                        water: (Math.random() * 1 + 2).toFixed(1),
                        sleepRating: Math.floor(Math.random() * 2) + 3 + (i < 7 ? 1 : 0),
                        hydrationRating: Math.floor(Math.random() * 2) + 3,
                        energyRating: Math.floor(Math.random() * 2) + 3 + (i < 3 ? 1 : 0),
                        date: dateKey
                    };

                    sampleData.score = calculateWellnessScore(sampleData);
                    demoUser.dailyData[dateKey] = sampleData;
                }
            }
        }
    }

    // ========== Page Visibility API ==========
    function handleVisibilityChange() {
        if (!document.hidden && currentUser) {
            // Refresh data when page becomes visible
            updateDashboardData();
        }
    }

    // ========== Window Load Event ==========
    window.addEventListener('load', () => {
        init();
        setupDemoMode();
        
        // Setup page visibility API
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Auto-focus on email input
        const emailInput = safe('login-email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    });

    // ========== Expose Global Functions (for HTML onclick handlers) ==========
    window.handleLogin = handleLogin;
    window.handleSignup = handleSignup;
    window.toggleForm = toggleForm;
    window.showPage = showPage;
    window.nextStep = nextStep;
    window.previousStep = previousStep;
    window.submitDailyData = submitDailyData;
    window.resetCheckin = resetCheckin;
    window.logout = logout;

    // ========== Additional Helper Functions ==========
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    function getMotivationalMessage(score) {
        if (score >= 90) return "Outstanding! You're a wellness champion! 🏆";
        if (score >= 80) return "Excellent work! Keep up the great habits! 🌟";
        if (score >= 70) return "Great progress! You're building momentum! 💪";
        if (score >= 60) return "Good job! Small steps lead to big changes! 🌱";
        if (score >= 50) return "You're on the right path! Keep going! 🚀";
        return "Every journey starts with a single step! 💚";
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6b7280'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Add CSS for toast animations
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(toastStyles);

    // ========== Data Persistence Simulation ==========
    function saveUserData() {
        // In a real app, this would save to a database
        // For demo purposes, we keep it in memory
        console.log('User data saved:', currentUser);
    }

    function loadUserData() {
        // In a real app, this would load from a database
        // For demo purposes, data persists during session
        console.log('User data loaded:', currentUser);
    }

    // ========== Enhanced UX Features ==========
    function addInputAnimations() {
        document.querySelectorAll('.input-large').forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.style.transform = 'translateY(-2px)';
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.style.transform = 'translateY(0)';
            });
        });
    }

    function addProgressAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressBars = entry.target.querySelectorAll('.goal-progress-fill');
                    progressBars.forEach(bar => {
                        const width = bar.style.width;
                        bar.style.width = '0%';
                        setTimeout(() => {
                            bar.style.width = width;
                        }, 100);
                    });
                }
            });
        });

        document.querySelectorAll('.goal-item').forEach(item => {
            observer.observe(item);
        });
    }

    // ========== Error Handling ==========
    function handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        showToast('Something went wrong. Please try again.', 'error');
    }

    window.addEventListener('error', (event) => {
        handleError(event.error, 'Global');
    });

    // ========== Performance Optimization ==========
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Debounced input handlers for better performance
    const debouncedUpdateReview = debounce(() => {
        if (currentStep === 5) {
            updateReviewData();
        }
    }, 300);

    // ========== Additional Initialization ==========
    document.addEventListener('DOMContentLoaded', () => {
        // Setup additional features
        addInputAnimations();
        
        // Setup input listeners for real-time updates
        document.querySelectorAll('.input-large').forEach(input => {
            input.addEventListener('input', debouncedUpdateReview);
        });

        // Setup progress animations
        setTimeout(addProgressAnimations, 1000);
        
        // Auto-save functionality (in real app would save to backend)
        setInterval(() => {
            if (currentUser) {
                saveUserData();
            }
        }, 30000); // Save every 30 seconds
    });

    // ========== Development Helpers ==========
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Development mode helpers
        window.WellnessApp = {
            users,
            currentUser: () => currentUser,
            generateSampleData: () => generateSampleData(),
            resetApp: () => {
                users = {};
                currentUser = null;
                logout();
            },
            fillDemoInputs: fillDemoData
        };
        
        console.log('Development mode: WellnessApp object available in console');
    }

    // ========== Health Tips and Recommendations ==========
    function getHealthTip(score) {
        const tips = {
            high: [
                "You're doing amazing! Consider sharing your wellness routine with colleagues.",
                "Excellent progress! Try adding a new healthy habit to your routine.",
                "Fantastic! You're setting a great example for healthy living."
            ],
            medium: [
                "Good progress! Try taking short walking breaks every 2 hours.",
                "You're on the right track! Consider setting a water reminder on your phone.",
                "Nice work! Try going to bed 15 minutes earlier tonight."
            ],
            low: [
                "Small steps count! Try parking further away or taking the stairs.",
                "Every improvement matters! Start with drinking one extra glass of water today.",
                "You've got this! Begin with a 5-minute walk after lunch."
            ]
        };

        let category = 'low';
        if (score >= 75) category = 'high';
        else if (score >= 50) category = 'medium';

        const categoryTips = tips[category];
        return categoryTips[Math.floor(Math.random() * categoryTips.length)];
    }

    // ========== Final Setup ==========
    // Ensure initialization happens
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();