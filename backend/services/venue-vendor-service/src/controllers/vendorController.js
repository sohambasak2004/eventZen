const vendorService = require('../services/vendorService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * @desc    Get all vendors
 * @route   GET /api/v1/vendors
 * @access  Private
 */
/**
 * @desc    Get single vendor
 * @route   GET /api/v1/vendors/:id
 * @access  Private
 */
const getVendor = catchAsync(async (req, res, next) => {
  const vendor = await vendorService.getVendorById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      vendor
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Get all vendors
 * @route   GET /api/v1/vendors
 * @access  Private
 */
const getVendors = catchAsync(async (req, res, next) => {
  const result = await vendorService.getVendors(req.query, req.query);

  res.status(200).json({
    status: 'success',
    data: {
      vendors: result.vendors,
      pagination: result.pagination
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Create vendor
 * @route   POST /api/v1/vendors
 * @access  Private (Admin only)
 */
const createVendor = catchAsync(async (req, res, next) => {
  const vendor = await vendorService.createVendor(req.body, req.user.userId);

  res.status(201).json({
    status: 'success',
    data: {
      vendor
    },
    message: 'Vendor created successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Update vendor
 * @route   PUT /api/v1/vendors/:id
 * @access  Private (Admin or Owner)
 */
const updateVendor = catchAsync(async (req, res, next) => {
  const vendor = await vendorService.updateVendor(
    req.params.id,
    req.body,
    req.user.userId
  );

  res.status(200).json({
    status: 'success',
    data: {
      vendor
    },
    message: 'Vendor updated successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Delete vendor
 * @route   DELETE /api/v1/vendors/:id
 * @access  Private (Admin only)
 */
const deleteVendor = catchAsync(async (req, res, next) => {
  await vendorService.deleteVendor(req.params.id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: null,
    message: 'Vendor deleted successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getVendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
};
