// import { check, sleep } from 'k6';
// import http from 'k6/http';

// export const options = {
//   stages: [
//     { duration: '20s', target: 500 }, // Ramp up to 500 users over 20 seconds
//     { duration: '10s', target: 500 }, // Hold at 500 users for 10 seconds
//     { duration: '20s', target: 0 },   // Ramp down to 0 users over 20 seconds
//   ],
// };

// export default function () {
//   // Option 1: If trade and regno are query parameters
//   // const res = http.get('https://your-website.com/api/endpoint?trade=GCS&regno=2331080');
  
//   // // Option 2: If you need to send them as POST data
//   // // const res = http.post('https://your-website.com/api/endpoint', {
//   // //   trade: "GCS",
//   // //   regno: "2331080",
//   // // });
  
//   const res = http.get('http://localhost:5173/aptitude/response/34', {
//     headers: {
//       'trade': 'GCS',
//       'regno': '2331080',
//     }
//   });

//   // Check response
//   check(res, { 
//     'status is 200': (r) => r.status === 200,
//     'response time < 500ms': (r) => r.timings.duration < 500,
//   });
  
//   sleep(1);
// }


import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '20s', target: 500 }, // Ramp up to 500 users over 20 seconds
    { duration: '10s', target: 500 }, // Hold at 500 users for 10 seconds
    { duration: '20s', target: 0 },   // Ramp down to 0 users over 20 seconds
  ],
};

export default function () {
  // Send query parameters for trade and regno
  const url = 'http://localhost:5173/aptitude/response/34?trade=GCS&regno=2331080';

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
