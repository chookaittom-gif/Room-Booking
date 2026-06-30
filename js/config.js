// กำหนด URL ของ Google Apps Script Web App Backend
const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.appConfig = {
  apiUrl: isVercel ? '/api/gas' : 'https://script.google.com/macros/s/AKfycby2Zk6Cl6vTr1YTf8zCRjAodngMz9SwlqzyHM4Ygt-cDtYF8nCQWiJlGshQVCkGX-pvAA/exec'
};

// จำลองการใช้ google.script.run ด้วย Proxy Pattern (สำหรับความเข้ากันได้ย้อนหลัง 100%)
(function() {
  function createRunner(successCallback, failureCallback) {
    return new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'withSuccessHandler') {
          return function(callback) {
            return createRunner(callback, failureCallback);
          };
        }
        if (prop === 'withFailureHandler') {
          return function(callback) {
            return createRunner(successCallback, callback);
          };
        }
        // ตรวจจับชื่อฟังก์ชันเซิร์ฟเวอร์
        return function(payload) {
          window.apiCall(prop, payload)
            .then(res => {
              if (successCallback) successCallback(res);
            })
            .catch(err => {
              if (failureCallback) failureCallback(err);
              else console.error(`Error executing ${prop}:`, err);
            });
        };
      }
    });
  }

  window.google = {
    script: {
      run: createRunner()
    }
  };
})();
