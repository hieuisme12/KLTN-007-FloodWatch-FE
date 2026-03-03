import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="app-main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

