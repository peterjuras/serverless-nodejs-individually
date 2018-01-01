// import AWS from 'aws-sdk';

export function handler(event, context, callback) {
  // API Gateway proxy style
  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Hello World',
  });

  // Direct invocation style
  // callback(null, 'Hello World');
}
