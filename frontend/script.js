const API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const questionInput = document.getElementById('question-input');
    const submitBtn = document.getElementById('submit-btn');
    const toggleContextBtn = document.getElementById('toggle-context');
    const contextContent = document.getElementById('context-content');
    const resultsContainer = document.getElementById('results-container');
    const loadingDiv = document.getElementById('loading');
    const loadingStatus = document.getElementById('loading-status');
    const answerText = document.getElementById('answer-text');
    const sourcesSummary = document.getElementById('sources-summary');
    const promptBtns = document.querySelectorAll('.prompt-btn');
    const rebuildBtn = document.getElementById('rebuild-btn');
    const toast = document.getElementById('toast');

    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }

    // Convert L2 FAISS score (0 is perfect, bigger is worse) into an estimated percentage 0-100%
    function calculateRelevancePercentage(l2Score) {
        // threshold is 1.5 based on app.py. So 0.0 -> 100%, 1.5 -> ~0%
        let percent = 100 - (l2Score * 66.6);
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        return Math.round(percent);
    }

    async function askQuestion(question) {
        if (!question.trim()) return;

        // Reset UI
        resultsContainer.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        contextContent.classList.add('hidden');
        toggleContextBtn.classList.remove('active');
        sourcesSummary.classList.add('hidden');

        loadingStatus.textContent = "Retrieving relevant sections...";
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin-fast"></i> <span>Analyzing...</span>';

        // Set timeout to simulate realistic thought progression text
        const thinkTimer = setTimeout(() => {
            loadingStatus.textContent = "Generating answer from context...";
        }, 1200);

        try {
            const response = await fetch(`${API_BASE_URL}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question })
            });

            clearTimeout(thinkTimer);

            if (!response.ok) {
                throw new Error('Failed to fetch answer');
            }

            const data = await response.json();

            // Render Answer
            answerText.textContent = data.answer;

            if (data.sources && data.sources.length > 0) {
                let contextHTML = '';
                let summaryHTML = '<div class="sources-list-title"><i class="fas fa-layer-group"></i> Document Sources:</div>';

                // Track unique pages for the summary to prevent duplicate bars if multiple chunks come from same page
                const renderedPages = new Set();

                data.sources.forEach((source) => {
                    const relevance = calculateRelevancePercentage(source.score);

                    // Add to summary if we haven't rendered this page's score yet (or if you want all chunks, ignore the Set)
                    if (!renderedPages.has(source.page)) {
                        renderedPages.add(source.page);

                        // Color coding the bar
                        let colorHex = 'var(--success-color)';
                        if (relevance < 50) colorHex = '#f59e0b'; // Amber
                        if (relevance < 20) colorHex = '#ef4444'; // Red

                        summaryHTML += `
                            <div class="summary-source-item">
                                <span class="page-pill"><i class="fas fa-file-alt"></i> Page ${source.page}</span>
                                <div class="score-bar-container">
                                    <div class="score-bar-bg">
                                        <div class="score-bar-fill" style="width: ${relevance}%; background-color: ${colorHex};"></div>
                                    </div>
                                    <span class="score-text">${relevance}%</span>
                                </div>
                            </div>
                        `;
                    }

                    // Add to actual context breakdown
                    contextHTML += `
                        <div class="source-item">
                            <div class="source-meta">
                                <span>Page ${source.page} extract</span>
                            </div>
                            <div class="source-text">${source.content}</div>
                        </div>
                    `;
                });

                sourcesSummary.innerHTML = summaryHTML;
                sourcesSummary.classList.remove('hidden');

                contextContent.innerHTML = contextHTML;
                toggleContextBtn.parentElement.style.display = 'block';
            } else {
                sourcesSummary.classList.add('hidden');
                contextContent.innerHTML = '<div class="source-item"><div class="source-text">No supporting context sources available.</div></div>';
                toggleContextBtn.parentElement.style.display = 'none';
            }

            loadingDiv.classList.add('hidden');
            resultsContainer.classList.remove('hidden');

        } catch (error) {
            clearTimeout(thinkTimer);
            console.error('Error:', error);
            showToast('An error occurred. Make sure the backend is running.');
            loadingDiv.classList.add('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> <span>Analyze</span>';
        }
    }

    submitBtn.addEventListener('click', () => {
        askQuestion(questionInput.value);
    });

    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            askQuestion(questionInput.value);
        }
    });

    promptBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const query = e.target.getAttribute('data-query');
            questionInput.value = query;
            askQuestion(query); // Auto-trigger search when clicked
        });
    });

    toggleContextBtn.addEventListener('click', () => {
        contextContent.classList.toggle('hidden');
        toggleContextBtn.classList.toggle('active');
    });

    rebuildBtn.addEventListener('click', async () => {
        showToast('🔄 Rebuilding Vector Index...');
        try {
            const response = await fetch(`${API_BASE_URL}/rebuild-index`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                showToast("✅ Index rebuilt successfully.", 4000);
            } else {
                showToast(`Error: ${data.detail || 'Failed to rebuild index'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error rebuilding index.');
        }
    });
});
