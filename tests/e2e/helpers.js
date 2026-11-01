// A returning player: the first-launch language question is already answered.
export async function skipLanguagePrompt(target) {
  await target.addInitScript(() => {
    try {
      if (localStorage.getItem('matofali.settings') === null && !sessionStorage.getItem('fresh-install')) {
        localStorage.setItem('matofali.settings', JSON.stringify({ sound: true, vibration: true, language: 'both' }));
      }
    } catch {
      /* storage blocked: the app will ask, which tests that need it handle */
    }
  });
}
