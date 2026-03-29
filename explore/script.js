const filterBtns  = document.querySelectorAll('.filter-btn');
const cards       = document.querySelectorAll('.project-card');
const emptyState  = document.getElementById('emptyState');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        let visible  = 0;

        cards.forEach(card => {
            const tags = card.dataset.tags.split(',');
            const isWip = tags.includes('coming-soon');
            // Coming Soong cards only show under "all".
            const show = filter === 'all'
                ? true
                : (!isWip && tags.includes(filter));
            card.classList.toggle('hidden', !show);
            if (show) visible++;
        });
    });
});