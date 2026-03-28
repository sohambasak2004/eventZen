const mongoose = require('mongoose');
const config = require('../src/config');
const { Venue, Vendor } = require('../src/models');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

const hasLocationCoordinates = (location) =>
  Array.isArray(location?.coordinates) && location.coordinates.length === 2;

const isEmptyArray = (value) => Array.isArray(value) && value.length === 0;

async function cleanupVenues() {
  const venues = await Venue.collection.find({}).toArray();
  let updatedCount = 0;

  for (const venue of venues) {
    const unset = {};

    if (isEmptyArray(venue.halls)) {
      unset.halls = '';
    }

    if (isEmptyArray(venue.amenities)) {
      unset.amenities = '';
    }

    if (isEmptyArray(venue.images)) {
      unset.images = '';
    }

    if (
      venue.contactInfo &&
      !isNonEmptyString(venue.contactInfo.email) &&
      !isNonEmptyString(venue.contactInfo.phone) &&
      !isNonEmptyString(venue.contactInfo.website)
    ) {
      unset.contactInfo = '';
    }

    if (venue.rating?.average === 0 && venue.rating?.count === 0) {
      unset.rating = '';
    }

    if (
      venue.policies &&
      !isNonEmptyString(venue.policies.cancellationPolicy) &&
      venue.policies.depositRequired === undefined &&
      venue.policies.setupTime === 2 &&
      venue.policies.cleanupTime === 2
    ) {
      unset.policies = '';
    }

    if (venue.availability && isEmptyArray(venue.availability.blackoutDates)) {
      unset['availability.blackoutDates'] = '';
    }

    if (Object.keys(unset).length > 0) {
      await Venue.collection.updateOne(
        { _id: venue._id },
        { $unset: unset, $set: { updatedAt: new Date() } }
      );
      updatedCount += 1;
    }
  }

  console.log(`venues: cleaned ${updatedCount} documents`);
}

async function cleanupVendors() {
  const vendors = await Vendor.collection.find({}).toArray();
  let updatedCount = 0;

  for (const vendor of vendors) {
    const unset = {};

    // `venues` is no longer used in vendor management and should be removed.
    if (vendor.venues !== undefined) {
      unset.venues = '';
    }

    if (isEmptyArray(vendor.serviceCategories)) {
      unset.serviceCategories = '';
    }

    if (
      vendor.address &&
      !isNonEmptyString(vendor.address.street) &&
      !isNonEmptyString(vendor.address.city) &&
      !isNonEmptyString(vendor.address.state) &&
      !isNonEmptyString(vendor.address.zipCode) &&
      (!isNonEmptyString(vendor.address.country) || vendor.address.country === 'USA')
    ) {
      unset.address = '';
    }

    if (
      vendor.serviceArea &&
      isEmptyArray(vendor.serviceArea.cities) &&
      !hasLocationCoordinates(vendor.serviceArea.location) &&
      (vendor.serviceArea.radius === 50 || vendor.serviceArea.radius === undefined)
    ) {
      unset.serviceArea = '';
    }

    if (isEmptyArray(vendor.packages)) {
      unset.packages = '';
    }

    if (
      vendor.pricing &&
      vendor.pricing.minimumBooking === 0 &&
      vendor.pricing.currency === 'USD' &&
      vendor.pricing.paymentTerms === 'advance_50'
    ) {
      unset.pricing = '';
    }

    if (vendor.rating?.average === 0 && vendor.rating?.count === 0) {
      unset.rating = '';
    }

    if (isEmptyArray(vendor.reviews)) {
      unset.reviews = '';
    }

    if (isEmptyArray(vendor.portfolio)) {
      unset.portfolio = '';
    }

    if (isEmptyArray(vendor.availability)) {
      unset.availability = '';
    }

    if (isEmptyArray(vendor.certifications)) {
      unset.certifications = '';
    }

    if (
      vendor.businessInfo &&
      !isNonEmptyString(vendor.businessInfo.licenseNumber) &&
      !isNonEmptyString(vendor.businessInfo.businessType) &&
      vendor.businessInfo.experienceYears === undefined &&
      (vendor.businessInfo.teamSize === 1 || vendor.businessInfo.teamSize === undefined)
    ) {
      unset.businessInfo = '';
    }

    if (
      vendor.verification &&
      vendor.verification.isVerified === false &&
      !vendor.verification.verificationDate &&
      !isNonEmptyString(vendor.verification.verifiedBy) &&
      isEmptyArray(vendor.verification.documents)
    ) {
      unset.verification = '';
    } else if (vendor.verification && isEmptyArray(vendor.verification.documents)) {
      unset['verification.documents'] = '';
    }

    if (
      vendor.preferences &&
      isEmptyArray(vendor.preferences.preferredEventTypes) &&
      vendor.preferences.minimumAdvanceBooking === 7 &&
      vendor.preferences.automaticConfirmation === false
    ) {
      unset.preferences = '';
    } else if (vendor.preferences && isEmptyArray(vendor.preferences.preferredEventTypes)) {
      unset['preferences.preferredEventTypes'] = '';
    }

    if (Object.keys(unset).length > 0) {
      await Vendor.collection.updateOne(
        { _id: vendor._id },
        { $unset: unset, $set: { updatedAt: new Date() } }
      );
      updatedCount += 1;
    }
  }

  console.log(`vendors: cleaned ${updatedCount} documents`);
}

async function main() {
  await mongoose.connect(config.database.mongodbUri);
  console.log(`Connected to ${config.database.mongodbUri}`);

  await cleanupVenues();
  await cleanupVendors();

  await mongoose.disconnect();
  console.log('Cleanup complete');
}

main().catch(async (error) => {
  console.error('Cleanup failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
