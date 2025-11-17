document.addEventListener('DOMContentLoaded', function () {
    Array.from(document.querySelectorAll('.faq-question')).forEach(function (btn) {
        btn.addEventListener('click', function () {
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
            var id = btn.getAttribute('aria-controls');
            var panel = document.getElementById(id);
            if (!panel) return;
            if (expanded) {
                panel.hidden = true;
            } else {
                panel.hidden = false;
            }
        });
    });
});