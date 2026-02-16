export default function errorMiddleware(err, req, res, next) {

  console.error(err);

  res.status(err.statusCode || 500).json({

    success: false,
    error: err.message

  });

}
