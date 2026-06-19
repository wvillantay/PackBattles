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
                    <Link to="/admin/company-inventory" className="admin-card">
                        <h3>Company Inventory</h3>
                        <p>Set available quantity and fulfillable status for trade-in replacements.</p>
                        <span className="admin-card-cta">Manage Inventory →</span>
                    </Link>
                    <Link to="/admin/card-import" className="admin-card">
                        <h3>Card Import</h3>
                        <p>Search TCGdex and import cards into the catalog with pricing data.</p>
                        <span className="admin-card-cta">Import Cards →</span>
                    </Link>
                    <Link to="/admin/ship-requests" className="admin-card">
                        <h3>Ship Requests</h3>
                        <p>Review pending shipment requests. Ship or reject with one click.</p>
                        <span className="admin-card-cta">Review Requests →</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default AdminDashboard;
