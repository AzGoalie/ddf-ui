/**
 * Copyright (c) Codice Foundation
 *
 * This is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser
 * General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details. A copy of the GNU Lesser General Public License
 * is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 *
 **/
/* eslint-disable no-var */

const _ = require('underscore')
const Backbone = require('backbone')
const usngs = require('usng.js')
const dmsUtils = require('../location-new/utils/dms-utils.js')
const DistanceUtils = require('../../js/DistanceUtils.js')
const wreqr = require('../../js/wreqr.js')

import { Drawing } from '../singletons/drawing'

const converter = new usngs.Converter()
const utmUpsLocationType = 'utmUps'
// offset used by utmUps for southern hemisphere
const utmUpsBoundaryNorth = 84
const utmUpsBoundarySouth = -80
const northingOffset = 10000000
const usngPrecision = 6
const Direction = dmsUtils.Direction

module.exports = Backbone.AssociatedModel.extend({
  defaults: () => {
    return {
      color: '#c89600',
      drawing: false,
      north: undefined,
      east: undefined,
      south: undefined,
      west: undefined,
      dmsNorth: undefined,
      dmsSouth: undefined,
      dmsEast: undefined,
      dmsWest: undefined,
      dmsNorthDirection: Direction.North,
      dmsSouthDirection: Direction.North,
      dmsEastDirection: Direction.East,
      dmsWestDirection: Direction.East,
      mapNorth: undefined,
      mapEast: undefined,
      mapWest: undefined,
      mapSouth: undefined,
      radiusUnits: 'meters',
      radius: '',
      locationType: 'dd',
      prevLocationType: 'dd',
      lat: undefined,
      lon: undefined,
      dmsLat: undefined,
      dmsLon: undefined,
      dmsLatDirection: Direction.North,
      dmsLonDirection: Direction.East,
      bbox: undefined,
      usng: undefined,
      utmUps: undefined,
      line: undefined,
      multiline: undefined,
      lineWidth: '',
      lineUnits: 'meters',
      polygon: undefined,
      polygonBufferWidth: '',
      polyType: undefined,
      polygonBufferUnits: 'meters',
      hasKeyword: false,
      keywordValue: undefined,
      utmUpsUpperLeftEasting: undefined,
      utmUpsUpperLeftNorthing: undefined,
      utmUpsUpperLeftHemisphere: 'Northern',
      utmUpsUpperLeftZone: 1,
      utmUpsLowerRightEasting: undefined,
      utmUpsLowerRightNorthing: undefined,
      utmUpsLowerRightHemisphere: 'Northern',
      utmUpsLowerRightZone: 1,
      utmUpsEasting: undefined,
      utmUpsNorthing: undefined,
      utmUpsZone: 1,
      utmUpsHemisphere: 'Northern',
      usngbbUpperLeft: undefined,
      usngbbLowerRight: undefined,
    }
  },
  set(key, value, options) {
    if (!_.isObject(key)) {
      const keyObject = {}
      keyObject[key] = value
      key = keyObject
      value = options
    }
    Backbone.AssociatedModel.prototype.set.call(this, key, value, options)
  },

  initialize() {
    this.listenTo(
      this,
      'change:north change:south change:east change:west',
      this.setBBox
    )
    this.listenTo(
      this,
      'change:dmsNorth change:dmsNorthDirection',
      this.setBboxDmsNorth
    )
    this.listenTo(
      this,
      'change:dmsSouth change:dmsSouthDirection',
      this.setBboxDmsSouth
    )
    this.listenTo(
      this,
      'change:dmsEast change:dmsEastDirection',
      this.setBboxDmsEast
    )
    this.listenTo(
      this,
      'change:dmsWest change:dmsWestDirection',
      this.setBboxDmsWest
    )
    this.listenTo(
      this,
      'change:dmsLat change:dmsLatDirection',
      this.setRadiusDmsLat
    )
    this.listenTo(
      this,
      'change:dmsLon change:dmsLonDirection',
      this.setRadiusDmsLon
    )
    this.listenTo(
      this,
      'change:usngbbUpperLeft change:usngbbLowerRight',
      this.setBboxUsng
    )
    this.listenTo(this, 'change:locationType', this.handleLocationType)
    this.listenTo(this, 'change:bbox', _.debounce(this.setBboxLatLon, 150))
    this.listenTo(this, 'change:lat change:lon', this.setRadiusLatLon)
    this.listenTo(this, 'change:usng', this.setRadiusUsng)
    this.listenTo(
      this,
      'change:utmUpsEasting change:utmUpsNorthing change:utmUpsZone change:utmUpsHemisphere',
      this.setRadiusUtmUps
    )
    this.listenTo(
      this,
      'change:utmUpsUpperLeftEasting change:utmUpsUpperLeftNorthing change:utmUpsUpperLeftZone change:utmUpsUpperLeftHemisphere change:utmUpsLowerRightEasting change:utmUpsLowerRightNorthing change:utmUpsLowerRightZone change:utmUpsLowerRightHemisphere',
      this.setBboxUtmUps
    )
    this.listenTo(this, 'change:mode', () => {
      this.set(this.defaults())
      wreqr.vent.trigger('search:drawend', this)
    })
    this.listenTo(this, 'EndExtent', this.drawingOff)
    this.listenTo(this, 'BeginExtent', this.drawingOn)
  },
  drawingOff() {
    if (this.get('locationType') === 'dms') {
      this.setBboxDmsFromMap()
    }
    const prevLocationType = this.get('prevLocationType')
    if (prevLocationType === 'utmUps') {
      this.set('prevLocationType', '')
      this.set('locationType', 'utmUps')
    }
    this.drawing = false
    Drawing.turnOffDrawing()
  },

  drawingOn() {
    const locationType = this.get('locationType')
    if (locationType === 'utmUps') {
      this.set('prevLocationType', 'utmUps')
      this.set('locationType', 'dd')
    }
    this.drawing = true
    Drawing.turnOnDrawing(this)
  },

  repositionLatLonUtmUps(isDefined, parse, assign, clear) {
    if (isDefined(this)) {
      const utmUpsParts = parse(this)
      if (utmUpsParts !== undefined) {
        const result = this.utmUpstoLL(utmUpsParts)

        if (result !== undefined) {
          const newResult = {}
          assign(newResult, result.lat, result.lon)

          this.set(newResult)
        } else {
          clear(this)
        }
      }
    }
  },

  repositionLatLon() {
    const result = this.usngBbToLatLon()
    if (result !== undefined) {
      try {
        const newResult = {}
        newResult.mapNorth = result.north
        newResult.mapSouth = result.south
        newResult.mapEast = result.east
        newResult.mapWest = result.west

        this.set(newResult)
      } catch (err) {
        // do nothing
      }
    }

    this.repositionLatLonUtmUps(
      (_this) => _this.isUtmUpsUpperLeftDefined(),
      (_this) => _this.parseUtmUpsUpperLeft(),
      (newResult, lat, lon) => {
        newResult.mapNorth = lat
        newResult.mapWest = lon
      },
      (_this) => _this.clearUtmUpsUpperLeft(true)
    )

    this.repositionLatLonUtmUps(
      (_this) => _this.isUtmUpsLowerRightDefined(),
      (_this) => _this.parseUtmUpsLowerRight(),
      (newResult, lat, lon) => {
        newResult.mapSouth = lat
        newResult.mapEast = lon
      },
      (_this) => _this.clearUtmUpsLowerRight(true)
    )
  },

  setLatLonUtmUps(result, isDefined, parse, assign, clear) {
    if (
      !(
        result.north !== undefined &&
        result.south !== undefined &&
        result.west !== undefined &&
        result.east !== undefined
      ) &&
      isDefined(this)
    ) {
      // eslint-disable-next-line no-undef
      const utmUpsParts = parse(_this)
      if (utmUpsParts !== undefined) {
        const utmUpsResult = this.utmUpstoLL(utmUpsParts)

        if (utmUpsResult !== undefined) {
          assign(result, utmUpsResult.lat, utmUpsResult.lon)
        } else {
          clear(this)
        }
      }
    }
  },

  setLatLon() {
    if (this.get('locationType') === 'dd') {
      let result = {}
      result.north = this.get('mapNorth')
      result.south = this.get('mapSouth')
      result.west = this.get('mapWest')
      result.east = this.get('mapEast')
      if (
        !(
          result.north !== undefined &&
          result.south !== undefined &&
          result.west !== undefined &&
          result.east !== undefined
        ) &&
        this.get('usngbbUpperLeft') &&
        this.get('usngbbLowerRight')
      ) {
        try {
          result = this.usngBbToLatLon()
        } catch (err) {
          // do nothing
        }
      }

      this.setLatLonUtmUps(
        result,
        (_this) => _this.isUtmUpsUpperLeftDefined(),
        (_this) => _this.parseUtmUpsUpperLeft(),
        (result, lat, lon) => {
          result.north = lat
          result.west = lon
        },
        (_this) => {
          _this.clearUtmUpsUpperLeft(true)
        }
      )

      this.setLatLonUtmUps(
        result,
        (_this) => _this.isUtmUpsLowerRightDefined(),
        (_this) => _this.parseUtmUpsLowerRight(),
        (result, lat, lon) => {
          result.south = lat
          result.east = lon
        },
        (_this) => {
          _this.clearUtmUpsLowerRight(true)
        }
      )

      result.north = DistanceUtils.coordinateRound(result.north)
      result.east = DistanceUtils.coordinateRound(result.east)
      result.south = DistanceUtils.coordinateRound(result.south)
      result.west = DistanceUtils.coordinateRound(result.west)
      this.set(result)
    } else if (this.get('locationType') === 'dms') {
      this.setBboxDmsFromMap()
    }
  },

  setFilterBBox(model) {
    const north = parseFloat(model.get('north'))
    const south = parseFloat(model.get('south'))
    const west = parseFloat(model.get('west'))
    const east = parseFloat(model.get('east'))

    model.set({
      mapNorth: north,
      mapSouth: south,
      mapEast: east,
      mapWest: west,
    })
  },

  setBboxLatLon() {
    const north = parseFloat(this.get('north')),
      south = parseFloat(this.get('south')),
      west = parseFloat(this.get('west')),
      east = parseFloat(this.get('east'))
    if (!this.isLatLonValid(north, west) || !this.isLatLonValid(south, east)) {
      return
    }

    let utmUps = this.LLtoUtmUps(north, west)
    if (utmUps !== undefined) {
      var utmUpsParts = this.formatUtmUps(utmUps)
      this.setUtmUpsUpperLeft(utmUpsParts, !this.isLocationTypeUtmUps())
    }

    utmUps = this.LLtoUtmUps(south, east)
    if (utmUps !== undefined) {
      // eslint-disable-next-line no-redeclare
      var utmUpsParts = this.formatUtmUps(utmUps)
      this.setUtmUpsLowerRight(utmUpsParts, !this.isLocationTypeUtmUps())
    }

    if (this.isLocationTypeUtmUps() && this.get('drawing')) {
      this.repositionLatLon()
    }

    const lat = (north + south) / 2
    const lon = (east + west) / 2
    if (this.isInUpsSpace(lat, lon)) {
      this.set({
        usngbbUpperLeft: undefined,
        usngbbLowerRight: undefined,
      })
      return
    }

    const result = this.usngBbFromLatLon({ north, west, south, east })

    this.set(result, {
      silent: this.get('locationType') !== 'usng',
    })

    if (this.get('locationType') === 'usng' && this.get('drawing')) {
      this.repositionLatLon()
    }
  },

  setRadiusLatLon() {
    const lat = this.get('lat'),
      lon = this.get('lon')

    if (
      (!Drawing.isDrawing() && this.get('locationType') !== 'latlon') ||
      !this.isLatLonValid(lat, lon)
    ) {
      return
    }

    this.setRadiusDmsFromMap()

    const utmUps = this.LLtoUtmUps(lat, lon)
    if (utmUps !== undefined) {
      const utmUpsParts = this.formatUtmUps(utmUps)
      this.setUtmUpsPointRadius(utmUpsParts, true)
    } else {
      this.clearUtmUpsPointRadius(false)
    }

    if (this.isInUpsSpace(lat, lon)) {
      this.set('usng', undefined)
      return
    }

    const usngsStr = converter.LLtoUSNG(lat, lon, usngPrecision)
    this.set('usng', usngsStr, { silent: true })
  },

  setRadiusDmsLat() {
    this.setLatLonFromDms('dmsLat', 'dmsLatDirection', 'lat')
  },

  setRadiusDmsLon() {
    this.setLatLonFromDms('dmsLon', 'dmsLonDirection', 'lon')
  },

  usngBbFromLatLon({ north, west, south, east }) {
    try {
      const usngbbUpperLeft = converter.LLtoUSNG(north, west, usngPrecision)
      const usngbbLowerRight = converter.LLtoUSNG(south, east, usngPrecision)
      return {
        usngbbUpperLeft,
        usngbbLowerRight,
      }
    } catch (err) {
      // do nothing
    }
    return {
      usngbbUpperLeft: undefined,
      usngbbLowerRight: undefined,
    }
  },

  usngBbToLatLon() {
    if (
      this.get('usngbbUpperLeft') !== undefined &&
      this.get('usngbbLowerRight') !== undefined
    ) {
      const { north, west } = converter.USNGtoLL(this.get('usngbbUpperLeft'))
      const { south, east } = converter.USNGtoLL(this.get('usngbbLowerRight'))
      return { north, south, east, west }
    }
    return {}
  },

  setBboxUsng() {
    if (this.get('locationType') !== 'usng') {
      return
    }

    const { north, west, south, east } = this.usngBbToLatLon()

    this.set({
      mapNorth: north,
      mapSouth: south,
      mapEast: east,
      mapWest: west,
    })

    this.set(
      {
        north,
        west,
        south,
        east,
      },
      {
        silent: true,
      }
    )

    let utmUps = this.LLtoUtmUps(north, west)
    if (utmUps !== undefined) {
      const utmUpsFormatted = this.formatUtmUps(utmUps)
      this.setUtmUpsUpperLeft(utmUpsFormatted, true)
    }

    utmUps = this.LLtoUtmUps(south, east)
    if (utmUps !== undefined) {
      const utmUpsFormatted = this.formatUtmUps(utmUps)
      this.setUtmUpsLowerRight(utmUpsFormatted, true)
    }
  },

  setBBox() {
    //we need these to always be inferred
    //as numeric values and never as strings
    const north = parseFloat(this.get('north'))
    const south = parseFloat(this.get('south'))
    const west = parseFloat(this.get('west'))
    const east = parseFloat(this.get('east'))

    if (
      north !== undefined &&
      south !== undefined &&
      east !== undefined &&
      west !== undefined
    ) {
      this.set('bbox', [west, south, east, north].join(','), {
        silent:
          (this.get('locationType') === 'usng' ||
            this.isLocationTypeUtmUps()) &&
          !this.get('drawing'),
      })
    }
    this.set({
      mapNorth: north,
      mapSouth: south,
      mapEast: east,
      mapWest: west,
    })
  },

  setRadiusUsng() {
    const usng = this.get('usng')
    if (usng === undefined) {
      return
    }

    let result
    try {
      result = converter.USNGtoLL(usng, true)
    } catch (err) {
      // do nothing
    }

    if (!isNaN(result.lat) && !isNaN(result.lon)) {
      this.set(result)

      const utmUps = this.LLtoUtmUps(result.lat, result.lon)
      if (utmUps !== undefined) {
        const utmUpsParts = this.formatUtmUps(utmUps)
        this.setUtmUpsPointRadius(utmUpsParts, true)
      }
    } else {
      this.clearUtmUpsPointRadius(true)
      this.set({
        lat: undefined,
        lon: undefined,
      })
    }
  },

  isLatLonValid(lat, lon) {
    lat = parseFloat(lat)
    lon = parseFloat(lon)
    return lat > -90 && lat < 90 && lon > -180 && lon < 180
  },

  isInUpsSpace(lat, lon) {
    lat = parseFloat(lat)
    lon = parseFloat(lon)
    return (
      this.isLatLonValid(lat, lon) &&
      (lat < utmUpsBoundarySouth || lat > utmUpsBoundaryNorth)
    )
  },

  // This method is called when the UTM/UPS point radius coordinates are changed by the user.
  setRadiusUtmUps() {
    if (!this.isLocationTypeUtmUps() && !this.isUtmUpsPointRadiusDefined()) {
      return
    }

    const utmUpsParts = this.parseUtmUpsPointRadius()
    if (utmUpsParts === undefined) {
      return
    }

    const utmUpsResult = this.utmUpstoLL(utmUpsParts)
    if (utmUpsResult === undefined) {
      if (utmUpsParts.zoneNumber !== 0) {
        this.clearUtmUpsPointRadius(true)
      }
      this.set({
        lat: undefined,
        lon: undefined,
        usng: undefined,
        radius: '',
      })
      return
    }
    this.set(utmUpsResult)

    const { lat, lon } = utmUpsResult
    if (!this.isLatLonValid(lat, lon) || this.isInUpsSpace(lat, lon)) {
      this.set({ usng: undefined })
      return
    }

    const usngsStr = converter.LLtoUSNG(lat, lon, usngPrecision)

    this.set('usng', usngsStr, { silent: true })
  },

  // This method is called when the UTM/UPS bounding box coordinates are changed by the user.
  setBboxUtmUps() {
    if (!this.isLocationTypeUtmUps()) {
      return
    }
    let upperLeft = undefined
    let lowerRight = undefined

    if (this.isUtmUpsUpperLeftDefined()) {
      const upperLeftParts = this.parseUtmUpsUpperLeft()
      if (upperLeftParts !== undefined) {
        upperLeft = this.utmUpstoLL(upperLeftParts)
        if (upperLeft !== undefined) {
          this.set({ mapNorth: upperLeft.lat, mapWest: upperLeft.lon })
          this.set(
            { north: upperLeft.lat, west: upperLeft.lon },
            { silent: true }
          )
        } else {
          this.set({
            mapNorth: undefined,
            mapSouth: undefined,
            mapEast: undefined,
            mapWest: undefined,
            usngbbUpperLeft: undefined,
            usngbbLowerRight: undefined,
          })
        }
      } else {
        this.set({ north: undefined, west: undefined }, { silent: true })
      }
    } else {
      this.set({ north: undefined, west: undefined }, { silent: true })
    }

    if (this.isUtmUpsLowerRightDefined()) {
      const lowerRightParts = this.parseUtmUpsLowerRight()
      if (lowerRightParts !== undefined) {
        lowerRight = this.utmUpstoLL(lowerRightParts)
        if (lowerRight !== undefined) {
          this.set({ mapSouth: lowerRight.lat, mapEast: lowerRight.lon })
          this.set(
            { south: lowerRight.lat, east: lowerRight.lon },
            { silent: true }
          )
        } else {
          this.set({
            mapNorth: undefined,
            mapSouth: undefined,
            mapEast: undefined,
            mapWest: undefined,
            usngbbUpperLeft: undefined,
            usngbbLowerRight: undefined,
          })
        }
      } else {
        this.set({ south: undefined, east: undefined }, { silent: true })
      }
    } else {
      this.set({ south: undefined, east: undefined }, { silent: true })
    }

    if (upperLeft === undefined || lowerRight == undefined) {
      return
    }

    const lat = (upperLeft.lat + lowerRight.lat) / 2
    const lon = (upperLeft.lon + lowerRight.lon) / 2

    if (!this.isLatLonValid(lat, lon) || this.isInUpsSpace(lat, lon)) {
      this.set({
        usngbbUpperLeft: undefined,
        usngbbLowerRight: undefined,
      })
      return
    }

    const result = this.usngBbFromLatLon({
      north: upperLeft.lat,
      south: lowerRight.lat,
      east: lowerRight.lon,
      west: upperLeft.lon,
    })
    this.set(result, {
      silent: this.get('locationType') === 'usng',
    })
  },

  setBboxDmsNorth() {
    this.setLatLonFromDms('dmsNorth', 'dmsNorthDirection', 'north')
  },

  setBboxDmsSouth() {
    this.setLatLonFromDms('dmsSouth', 'dmsSouthDirection', 'south')
  },

  setBboxDmsEast() {
    this.setLatLonFromDms('dmsEast', 'dmsEastDirection', 'east')
  },

  setBboxDmsWest() {
    this.setLatLonFromDms('dmsWest', 'dmsWestDirection', 'west')
  },

  setBboxDmsFromMap() {
    const dmsNorth = dmsUtils.ddToDmsCoordinateLat(
      this.get('mapNorth'),
      dmsUtils.getSecondsPrecision(this.get('dmsNorth'))
    )
    const dmsSouth = dmsUtils.ddToDmsCoordinateLat(
      this.get('mapSouth'),
      dmsUtils.getSecondsPrecision(this.get('dmsSouth'))
    )
    const dmsWest = dmsUtils.ddToDmsCoordinateLon(
      this.get('mapWest'),
      dmsUtils.getSecondsPrecision(this.get('dmsWest'))
    )
    const dmsEast = dmsUtils.ddToDmsCoordinateLon(
      this.get('mapEast'),
      dmsUtils.getSecondsPrecision(this.get('dmsEast'))
    )
    this.set(
      {
        dmsNorth: dmsNorth && dmsNorth.coordinate,
        dmsNorthDirection: (dmsNorth && dmsNorth.direction) || Direction.North,
        dmsSouth: dmsSouth && dmsSouth.coordinate,
        dmsSouthDirection: (dmsSouth && dmsSouth.direction) || Direction.North,
        dmsWest: dmsWest && dmsWest.coordinate,
        dmsWestDirection: (dmsWest && dmsWest.direction) || Direction.East,
        dmsEast: dmsEast && dmsEast.coordinate,
        dmsEastDirection: (dmsEast && dmsEast.direction) || Direction.East,
      },
      { silent: true }
    )
  },

  setRadiusDmsFromMap() {
    const dmsLat = dmsUtils.ddToDmsCoordinateLat(
      this.get('lat'),
      dmsUtils.getSecondsPrecision(this.get('dmsLat'))
    )
    const dmsLon = dmsUtils.ddToDmsCoordinateLon(
      this.get('lon'),
      dmsUtils.getSecondsPrecision(this.get('dmsLon'))
    )
    this.set(
      {
        dmsLat: dmsLat && dmsLat.coordinate,
        dmsLatDirection: (dmsLat && dmsLat.direction) || Direction.North,
        dmsLon: dmsLon && dmsLon.coordinate,
        dmsLonDirection: (dmsLon && dmsLon.direction) || Direction.East,
      },
      { silent: true }
    )
  },

  setLatLonFromDms(dmsCoordinateKey, dmsDirectionKey, latLonKey) {
    const dmsCoordinate = dmsUtils.parseDmsCoordinate(
      this.get(dmsCoordinateKey)
    )
    if (dmsCoordinate) {
      this.set(
        latLonKey,
        dmsUtils.dmsCoordinateToDD({
          ...dmsCoordinate,
          direction: this.get(dmsDirectionKey),
        })
      )
    } else {
      this.set(latLonKey, undefined)
    }
  },

  handleLocationType() {
    if (this.get('locationType') === 'dd') {
      this.set({
        north: this.get('mapNorth'),
        south: this.get('mapSouth'),
        east: this.get('mapEast'),
        west: this.get('mapWest'),
      })
    } else if (this.get('locationType') === 'dms') {
      this.setBboxDmsFromMap()
      this.setRadiusDmsFromMap()
    }
  },

  // Convert Lat-Lon to UTM/UPS coordinates. Returns undefined if lat or lon is undefined or not a number.
  // Returns undefined if the underlying call to usng fails. Otherwise, returns an object with:
  //
  //   easting    : FLOAT
  //   northing   : FLOAT
  //   zoneNumber : INTEGER (>=0 and <= 60)
  //   hemisphere : STRING (NORTHERN or SOUTHERN)
  LLtoUtmUps(lat, lon) {
    lat = parseFloat(lat)
    lon = parseFloat(lon)
    if (!this.isLatLonValid(lat, lon)) {
      return undefined
    }

    let utmUps = converter.LLtoUTMUPSObject(lat, lon)

    utmUps.hemisphere = lat >= 0 ? 'NORTHERN' : 'SOUTHERN'
    return utmUps
  },

  // Convert UTM/UPS coordinates to Lat-Lon. Expects an argument object with:
  //
  //   easting    : FLOAT
  //   northing   : FLOAT
  //   zoneNumber : INTEGER (>=0 and <= 60)
  //   hemisphere : STRING (NORTHERN or SOUTHERN)
  //
  // Returns an object with:
  //
  //   lat : FLOAT
  //   lon : FLOAT
  //
  // Returns undefined if the latitude is out of range.
  //
  utmUpstoLL(utmUpsParts) {
    const { hemisphere, zoneNumber, northing } = utmUpsParts
    const northernHemisphere = hemisphere === 'NORTHERN'

    utmUpsParts = {
      ...utmUpsParts,
      northPole: northernHemisphere,
    }

    const isUps = zoneNumber === 0
    utmUpsParts.northing =
      isUps || northernHemisphere ? northing : northing - northingOffset

    let lat, lon
    try {
      const result = converter.UTMUPStoLL(utmUpsParts)
      lat = result.lat
      lon = result.lon % 360
      if (lon < -180) {
        lon = lon + 360
      }
      if (lon > 180) {
        lon = lon - 360
      }
      if (!this.isLatLonValid(lat, lon)) {
        return { lat: undefined, lon: undefined }
      }
    } catch (err) {
      return { lat: undefined, lon: undefined }
    }

    return { lat, lon }
  },

  // Return true if the current location type is UTM/UPS, otherwise false.
  isLocationTypeUtmUps() {
    return this.get('locationType') === utmUpsLocationType
  },

  // Set the model fields for the Upper-Left bounding box UTM/UPS. The arguments are:
  //
  //   utmUpsFormatted : output from the method 'formatUtmUps'
  //   silent       : BOOLEAN (true if events should be generated)
  setUtmUpsUpperLeft(utmUpsFormatted, silent) {
    this.set('utmUpsUpperLeftEasting', utmUpsFormatted.easting, {
      silent,
    })
    this.set('utmUpsUpperLeftNorthing', utmUpsFormatted.northing, {
      silent,
    })
    this.set('utmUpsUpperLeftZone', utmUpsFormatted.zoneNumber, {
      silent,
    })
    this.set('utmUpsUpperLeftHemisphere', utmUpsFormatted.hemisphere, {
      silent,
    })
  },

  // Set the model fields for the Lower-Right bounding box UTM/UPS. The arguments are:
  //
  //   utmUpsFormatted : output from the method 'formatUtmUps'
  //   silent       : BOOLEAN (true if events should be generated)
  setUtmUpsLowerRight(utmUpsFormatted, silent) {
    this.set('utmUpsLowerRightEasting', utmUpsFormatted.easting, {
      silent,
    })
    this.set('utmUpsLowerRightNorthing', utmUpsFormatted.northing, {
      silent,
    })
    this.set('utmUpsLowerRightZone', utmUpsFormatted.zoneNumber, {
      silent,
    })
    this.set('utmUpsLowerRightHemisphere', utmUpsFormatted.hemisphere, {
      silent,
    })
  },

  // Set the model fields for the Point Radius UTM/UPS. The arguments are:
  //
  //   utmUpsFormatted : output from the method 'formatUtmUps'
  //   silent       : BOOLEAN (true if events should be generated)
  setUtmUpsPointRadius(utmUpsFormatted, silent) {
    this.set('utmUpsEasting', utmUpsFormatted.easting, { silent })
    this.set('utmUpsNorthing', utmUpsFormatted.northing, { silent })
    this.set('utmUpsZone', utmUpsFormatted.zoneNumber, { silent })
    this.set('utmUpsHemisphere', utmUpsFormatted.hemisphere, {
      silent,
    })
  },

  clearUtmUpsPointRadius(silent) {
    this.set('utmUpsEasting', undefined, { silent })
    this.set('utmUpsNorthing', undefined, { silent })
    this.set('utmUpsZone', 1, { silent })
    this.set('utmUpsHemisphere', 'Northern', { silent })
  },

  clearUtmUpsUpperLeft(silent) {
    this.set(
      {
        utmUpsUpperLeftEasting: undefined,
        utmUpsUpperLeftNorthing: undefined,
        utmUpsUpperLeftZone: 1,
        utmUpsUpperLeftHemisphere: 'Northern',
      },
      { silent }
    )
  },

  clearUtmUpsLowerRight(silent) {
    this.set('utmUpsLowerRightEasting', undefined, { silent })
    this.set('utmUpsLowerRightNorthing', undefined, { silent })
    this.set('utmUpsLowerRightZone', 1, { silent })
    this.set('utmUpsLowerRightHemisphere', 'Northern', { silent })
  },

  // Parse the UTM/UPS fields that come from the HTML layer. The parameters eastingRaw and northingRaw
  // are string representations of floating pointnumbers. The zoneRaw parameter is a string
  // representation of an integer in the range [0,60]. The hemisphereRaw parameters is a string
  // that should be 'Northern' or 'Southern'.
  parseUtmUps(eastingRaw, northingRaw, zoneRaw, hemisphereRaw) {
    const easting = parseFloat(eastingRaw)
    const northing = parseFloat(northingRaw)
    const zone = parseInt(zoneRaw)
    const hemisphere =
      hemisphereRaw === 'Northern'
        ? 'NORTHERN'
        : hemisphereRaw === 'Southern'
        ? 'SOUTHERN'
        : undefined

    if (
      !isNaN(easting) &&
      !isNaN(northing) &&
      !isNaN(zone) &&
      hemisphere !== undefined &&
      zone >= 0 &&
      zone <= 60
    ) {
      return {
        zoneNumber: zone,
        hemisphere,
        easting,
        northing,
      }
    }

    return undefined
  },

  // Format the internal representation of UTM/UPS coordinates into the form expected by the model.
  formatUtmUps(utmUps) {
    return {
      easting: utmUps.easting,
      northing: utmUps.northing,
      zoneNumber: utmUps.zoneNumber,
      hemisphere:
        utmUps.hemisphere === 'NORTHERN'
          ? 'Northern'
          : utmUps.hemisphere === 'SOUTHERN'
          ? 'Southern'
          : undefined,
    }
  },

  // Return true if all of the UTM/UPS upper-left model fields are defined. Otherwise, false.
  isUtmUpsUpperLeftDefined() {
    return (
      this.get('utmUpsUpperLeftEasting') !== undefined &&
      this.get('utmUpsUpperLeftNorthing') !== undefined &&
      this.get('utmUpsUpperLeftZone') !== undefined &&
      this.get('utmUpsUpperLeftHemisphere') !== undefined
    )
  },

  // Return true if all of the UTM/UPS lower-right model fields are defined. Otherwise, false.
  isUtmUpsLowerRightDefined() {
    return (
      this.get('utmUpsLowerRightEasting') !== undefined &&
      this.get('utmUpsLowerRightNorthing') !== undefined &&
      this.get('utmUpsLowerRightZone') !== undefined &&
      this.get('utmUpsLowerRightHemisphere') !== undefined
    )
  },

  // Return true if all of the UTM/UPS point radius model fields are defined. Otherwise, false.
  isUtmUpsPointRadiusDefined() {
    return (
      this.get('utmUpsEasting') !== undefined &&
      this.get('utmUpsNorthing') !== undefined &&
      this.get('utmUpsZone') !== undefined &&
      this.get('utmUpsHemisphere') !== undefined
    )
  },

  // Get the UTM/UPS Upper-Left bounding box fields in the internal format. See 'parseUtmUps'.
  parseUtmUpsUpperLeft() {
    return this.parseUtmUps(
      this.get('utmUpsUpperLeftEasting'),
      this.get('utmUpsUpperLeftNorthing'),
      this.get('utmUpsUpperLeftZone'),
      this.get('utmUpsUpperLeftHemisphere')
    )
  },

  // Get the UTM/UPS Lower-Right bounding box fields in the internal format. See 'parseUtmUps'.
  parseUtmUpsLowerRight() {
    return this.parseUtmUps(
      this.get('utmUpsLowerRightEasting'),
      this.get('utmUpsLowerRightNorthing'),
      this.get('utmUpsLowerRightZone'),
      this.get('utmUpsLowerRightHemisphere')
    )
  },

  // Get the UTM/UPS point radius fields in the internal format. See 'parseUtmUps'.
  parseUtmUpsPointRadius() {
    return this.parseUtmUps(
      this.get('utmUpsEasting'),
      this.get('utmUpsNorthing'),
      this.get('utmUpsZone'),
      this.get('utmUpsHemisphere')
    )
  },
})
