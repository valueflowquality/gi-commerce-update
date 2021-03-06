gi = require 'gi-util-updated'
conFac = gi.common.crudControllerFactory
quaderno = require './quaderno'

module.exports = (app) ->
  discountCode = require('./discountCode') app.models.discountCodes
  address:      conFac app.models.addresses
  priceList:    conFac app.models.priceLists
  currency:     conFac app.models.currencies
  country:      conFac app.models.countries
  discountCode: discountCode

  market:    conFac app.models.markets
  quaderno: quaderno()
