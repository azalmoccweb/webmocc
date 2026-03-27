document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sync-mailbox-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sync edilir...';
      try {
        const response = await fetch('/sync-mailbox', { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Sync failed');
        alert(`Sync tamamlandı. Yeni request: ${data.created}, keçilən: ${data.skipped}, ignore edilən: ${data.ignored || 0}`);
        window.location.reload();
      } catch (error) {
        alert(error.message || 'Xəta baş verdi');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  document.querySelectorAll('form[action*="/reject"]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm('Bu request-i reject etmək istədiyinizə əminsiniz?')) {
        event.preventDefault();
      }
    });
  });
});
