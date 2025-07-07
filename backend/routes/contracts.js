console.log('Contracts router loaded');
const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Të gjithë të loguarit mund të shohin kontratat
router.get('/', verifyToken, contractController.getAllContracts);
router.get('/:id', verifyToken, contractController.getContractById);

// Vetëm adminët mund të krijojnë, përditësojnë ose fshijnë kontrata
router.post('/', verifyToken, requireRole('admin'), contractController.createContract);
router.put('/:id', verifyToken, requireRole('admin'), contractController.updateContract);
router.delete('/:id', verifyToken, requireRole('admin'), contractController.deleteContract);

// Komentet
router.post('/:id/comments', verifyToken, contractController.addComment);

// Dokumentet
router.put('/:id/documents', verifyToken, contractController.uploadDocument);
router.delete('/:id/documents/:index', verifyToken, contractController.deleteDocument);

// backend/routes/contracts.js
router.get('/contract-number/:contract_number', verifyToken, contractController.getContractByNumber);

module.exports = router;
