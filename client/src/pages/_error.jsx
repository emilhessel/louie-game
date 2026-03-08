function Error({ statusCode }) {
  return (
    <p>{statusCode ? `${statusCode} — Server error` : 'Client error'}</p>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
