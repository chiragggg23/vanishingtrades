import multer from 'multer';
import mongoose from 'mongoose';
import { MSG } from '../utils/http.js';

export function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'No such endpoint.' });
}

/** Central error handler: always returns the envelope. */
export function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something broke on our side.';
  const body = { success: false };

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message =
        err.field === 'image' ? 'Images can be at most 5 MB.' : 'Recordings can be at most 10 MB.';
    } else {
      status = 400;
      message = 'That upload was not in the expected form.';
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large.';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    message = MSG.notFound;
  } else if (err?.code === 11000) {
    status = 409;
    message = 'That already exists.';
  }

  if (status >= 500) {
    console.error(err);
    message = 'Something broke on our side.';
  }
  body.message = message;
  if (
    err.code &&
    typeof err.code === 'string' &&
    status < 500 &&
    !(err instanceof multer.MulterError)
  )
    body.code = err.code;
  if (err.errors && status === 422) body.errors = err.errors;
  else if (err.errors && status === 409 && !(err instanceof mongoose.Error))
    body.errors = err.errors;
  res.status(status).json(body);
}
