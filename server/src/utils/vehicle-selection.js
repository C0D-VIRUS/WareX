
const VEHICLE_CLASSES = [
    {
      rank: 1,
      label: 'Bike',
      matches: ['bike', 'motorbike', 'motorcycle', 'scooter', 'twowheeler'],
    },
    {
      rank: 2,
      label: 'Three-wheeler',
      matches: ['threewheeler', '3wheeler', 'auto', 'rickshaw', 'tuktuk'],
    },
    {
      rank: 3,
      label: 'Four-wheeler',
      matches: ['fourwheeler', '4wheeler', 'van', 'pickup', 'deliverycar'],
    },
    {
      rank: 4,
      label: 'Small truck',
      matches: ['smalltruck', 'minitruck', 'lighttruck'],
    },
    {
      rank: 5,
      label: 'Large truck',
      matches: ['largetruck', 'heavytruck', 'lorry', 'trailer'],
    },
  ]

  function classifyVehicle(vehicleType) {
    const type = String(vehicleType || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    // Check larger and more specific truck names first.
    return (
      VEHICLE_CLASSES.find((vehicleClass) =>
        vehicleClass.matches.some((match) => type.includes(match))
      ) || (type.includes('truck')
        ? VEHICLE_CLASSES[3]
        : null)
    )
  }

  export function validatePackageDetails(input = {}) {
    const details = {
      packageWeightKg: Number(input.packageWeightKg),
      packageLengthCm: Number(input.packageLengthCm),
      packageWidthCm: Number(input.packageWidthCm),
      packageHeightCm: Number(input.packageHeightCm),
      estimatedDistanceKm: Number(input.estimatedDistanceKm),
    }

    const labels = {
      packageWeightKg: 'Package weight',
      packageLengthCm: 'Package length',
      packageWidthCm: 'Package width',
      packageHeightCm: 'Package height',
      estimatedDistanceKm: 'Estimated delivery distance',
    }

    for (const [field, label] of Object.entries(labels)) {
      if (!Number.isFinite(details[field]) || details[field] <= 0) {
        return {
          valid: false,
          message: `${label} must be a number greater than zero.`,
        }
      }
    }

    return { valid: true, details }
  }

  function dimensionsFit(packageDetails, vehicle) {
    const packageDimensions = [
      packageDetails.packageLengthCm,
      packageDetails.packageWidthCm,
      packageDetails.packageHeightCm,
    ].sort((a, b) => a - b)

    const vehicleDimensions = [
      vehicle.maxLengthCm,
      vehicle.maxWidthCm,
      vehicle.maxHeightCm,
    ].sort((a, b) => a - b)

    // Allow the package to be rotated to fit the vehicle.
    return packageDimensions.every(
      (dimension, index) => dimension <= vehicleDimensions[index]
    )
  }

  function hasCompleteSpecifications(vehicle) {
    return (
      Number(vehicle.maxWeightKg) > 0 &&
      Number(vehicle.maxLengthCm) > 0 &&
      Number(vehicle.maxWidthCm) > 0 &&
      Number(vehicle.maxHeightCm) > 0 &&
      Number(vehicle.operatingCostPerKm) > 0 &&
      Number(vehicle.energyUsePerKm) > 0 &&
      Number(vehicle.averageSpeedKmph) > 0
    )
  }

  function estimateVehicle(vehicle, distanceKm) {
    return {
      ...vehicle,
      vehicleClass: classifyVehicle(vehicle.vehicleType).label,
      estimatedOperatingCost:
        Number(vehicle.operatingCostPerKm) * distanceKm,
      estimatedEnergyUse:
        Number(vehicle.energyUsePerKm) * distanceKm,
      estimatedTravelHours:
        distanceKm / Number(vehicle.averageSpeedKmph),
    }
  }

  function normalize(value, minimum, maximum) {
    if (maximum === minimum) return 0
    return (value - minimum) / (maximum - minimum)
  }

  function scoreVehicles(vehicles) {
    const metrics = [
      'estimatedOperatingCost',
      'estimatedEnergyUse',
      'estimatedTravelHours',
    ]

    const ranges = Object.fromEntries(
      metrics.map((metric) => {
        const values = vehicles.map((vehicle) => vehicle[metric])
        return [
          metric,
          {
            minimum: Math.min(...values),
            maximum: Math.max(...values),
          },
        ]
      })
    )

    return vehicles
      .map((vehicle) => {
        const cost = ranges.estimatedOperatingCost
        const energy = ranges.estimatedEnergyUse
        const time = ranges.estimatedTravelHours

        // Lower scores are better. These weights can be adjusted later.
        const score =
          normalize(
            vehicle.estimatedOperatingCost,
            cost.minimum,
            cost.maximum
          ) * 0.45 +
          normalize(
            vehicle.estimatedEnergyUse,
            energy.minimum,
            energy.maximum
          ) * 0.30 +
          normalize(
            vehicle.estimatedTravelHours,
            time.minimum,
            time.maximum
          ) * 0.25

        return { ...vehicle, selectionScore: score }
      })
      .sort(
        (a, b) =>
          a.selectionScore - b.selectionScore ||
          a.estimatedOperatingCost - b.estimatedOperatingCost ||
          a.estimatedTravelHours - b.estimatedTravelHours
      )
  }

  export function selectSuitableVehicle(vehicles, packageDetails) {
    const availableVehicles = vehicles.filter(
      (vehicle) => vehicle.status === 'AVAILABLE'
    )

    const configuredVehicles = availableVehicles
      .filter(hasCompleteSpecifications)
      .map((vehicle) => ({
        ...vehicle,
        classification: classifyVehicle(vehicle.vehicleType),
      }))
      .filter((vehicle) => vehicle.classification !== null)

    const fittingVehicles = configuredVehicles
      .filter(
        (vehicle) =>
          Number(vehicle.maxWeightKg) >= packageDetails.packageWeightKg &&
          dimensionsFit(packageDetails, vehicle)
      )
      .map((vehicle) =>
        estimateVehicle(vehicle, packageDetails.estimatedDistanceKm)
      )

    if (fittingVehicles.length === 0) {
      return {
        success: false,
        message:
          'No available, fully configured vehicle can carry this package. Check vehicle availability, weight limits, dimensions, cost, energy usage and speed.',
        recommendedVehicle: null,
        alternatives: [],
      }
    }

    // Respect the requested order: use the smallest capable vehicle class.
    const smallestRank = Math.min(
      ...fittingVehicles.map(
        (vehicle) => vehicle.classification?.rank ??
          classifyVehicle(vehicle.vehicleType).rank
      )
    )

    const smallestClassCandidates = fittingVehicles.filter(
      (vehicle) =>
        (vehicle.classification?.rank ??
          classifyVehicle(vehicle.vehicleType).rank) === smallestRank
    )

    const ranked = scoreVehicles(smallestClassCandidates)

    const {
      classification,
      ...recommendedVehicle
    } = ranked[0]

    return {
      success: true,
      message: `${classification?.label || recommendedVehicle.vehicleClass} selected as the smallest suitable available vehicle.`,
      recommendedVehicle,
      alternatives: ranked.slice(1).map(({ classification, ...vehicle }) => vehicle),
    }
  }
