import { NextPage } from 'next';

const UnauthorizedPage: NextPage = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
    </div>
  );
};

export default UnauthorizedPage;
