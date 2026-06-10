import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <div>
                        <h2>Admin Panel</h2>
                        <p className="admin-subtitle">Logged in as {user?.name}</p>
                    </div>
                </div>

                <div className="admin-cards">
                    <Link to="/admin/users" className="admin-card">
                        <h3>Users</h3>
                        <p>View all registered accounts, search by name or email.</p>
                        <span className="admin-card-cta">View Users →</span>
                    </Link>
                    <Link to="/admin/battles" className="admin-card">
                        <h3>Battles</h3>
                        <p>Browse all battles. Filter by status or type.</p>
                        <span className="admin-card-cta">View Battles →</span>
                    </Link>
                    <Link to="/admin/transactions" className="admin-card">
                        <h3>Transactions</h3>
                        <p>Full credit ledger for every user. Filter by category.</p>
                        <span className="admin-card-cta">View Transactions →</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default AdminDashboard;
