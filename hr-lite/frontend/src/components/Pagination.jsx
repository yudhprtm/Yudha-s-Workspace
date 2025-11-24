import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '20px' }}>
            <button
                className="btn"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                style={{ padding: '5px 10px' }}
            >
                &lt; Prev
            </button>

            {pages.map(page => (
                <button
                    key={page}
                    className={`btn ${currentPage === page ? 'btn-primary' : ''}`}
                    onClick={() => onPageChange(page)}
                    style={{ padding: '5px 10px', minWidth: '30px' }}
                >
                    {page}
                </button>
            ))}

            <button
                className="btn"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                style={{ padding: '5px 10px' }}
            >
                Next &gt;
            </button>
        </div>
    );
};

export default Pagination;
