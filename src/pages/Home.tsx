import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const goToAdmin = () => {
    navigate('/admin');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Bienvenue sur Naria Admin</h1>
      <p>Cliquez ci-dessous pour accéder à la gestion des annonces :</p>
      <button
        onClick={goToAdmin}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          border: 'none',
          fontSize: '16px',
        }}
      >
        Accéder à l’espace admin
      </button>
    </div>
  );
};

export default Home;
