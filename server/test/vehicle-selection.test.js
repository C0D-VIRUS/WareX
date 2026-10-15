import test from 'node:test'
import assert from 'node:assert/strict'
import { selectSuitableVehicle, validatePackageDetails } from '../src/utils/vehicle-selection.js'

const packageDetails = {
  packageWeightKg: 20,
  packageLengthCm: 70,
  packageWidthCm: 40,
  packageHeightCm: 30,
  estimatedDistanceKm: 25,
}

function vehicle(overrides = {}) {
  return {
    id: 'vehicle-1',
    registrationNo: 'MH14-WRX-01',
    vehicleType: 'Delivery Van',
    status: 'AVAILABLE',
    maxWeightKg: 500,
    maxLengthCm: 300,
    maxWidthCm: 160,
    maxHeightCm: 160,
    operatingCostPerKm: 12,
    energyUsePerKm: 0.18,
    averageSpeedKmph: 35,
    ...overrides,
  }
}

test('validates all package measurements as positive numbers', () => {
  assert.equal(validatePackageDetails(packageDetails).valid, true)
  assert.equal(validatePackageDetails({ ...packageDetails, packageWeightKg: 0 }).valid, false)
  assert.equal(validatePackageDetails({ ...packageDetails, estimatedDistanceKm: 'nope' }).valid, false)
})

test('selects the smallest capable vehicle class', () => {
  const vehicles = [
    vehicle({ id: 'truck', registrationNo: 'TRUCK-1', vehicleType: 'Small Truck', maxWeightKg: 2000, maxLengthCm: 500, maxWidthCm: 220, maxHeightCm: 220 }),
    vehicle({ id: 'van', registrationNo: 'VAN-1', vehicleType: 'Delivery Van' }),
    vehicle({ id: 'bike', registrationNo: 'BIKE-1', vehicleType: 'Motorbike', maxWeightKg: 10, maxLengthCm: 80, maxWidthCm: 50, maxHeightCm: 50 }),
  ]
  const result = selectSuitableVehicle(vehicles, packageDetails)
  assert.equal(result.success, true)
  assert.equal(result.recommendedVehicle.id, 'van')
  assert.ok(result.recommendedVehicle.estimatedOperatingCost > 0)
  assert.ok(result.recommendedVehicle.selectionScore >= 0)
})

test('does not select unavailable or under-specified vehicles', () => {
  const result = selectSuitableVehicle([
    vehicle({ status: 'IN_USE' }),
    vehicle({ id: 'incomplete', maxWeightKg: 0 }),
  ], packageDetails)
  assert.equal(result.success, false)
  assert.equal(result.recommendedVehicle, null)
})

test('supports rotating a package to fit vehicle dimensions', () => {
  const rotatedPackage = { ...packageDetails, packageLengthCm: 140, packageWidthCm: 80, packageHeightCm: 60 }
  const narrowVehicle = vehicle({ maxLengthCm: 150, maxWidthCm: 90, maxHeightCm: 70 })
  assert.equal(selectSuitableVehicle([narrowVehicle], rotatedPackage).success, true)
})
