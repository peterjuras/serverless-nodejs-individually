import ncp from 'ncp';

export default function ncpPromise(...args) {
  return new Promise((resolve, reject) => {
    ncp(...args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
