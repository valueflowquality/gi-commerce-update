angular.module('gi.commerce').factory 'giCartItem'
, ['$rootScope', 'giLocalStorage'
, ($rootScope, store) ->

  item = (id, name, priceList, quantity,data) ->
    @setId(id)
    @setName(name)
    @setPriceList(priceList)
    @setQuantity(quantity)
    @setData(data)

  item.prototype.setId = (id) ->
    if (id)
      @_id = id
    else
      console.error('An ID must be provided')

  item.prototype.getId = () ->
    @_id

  item.prototype.setName = (name) ->
    if name
      @_name = name
    else
      console.error('A name must be provided')

  item.prototype.getName = () ->
    @_name

  item.prototype.setPriceList = (priceList) ->
    if priceList?
      @_priceList = priceList
    else
      console.error('A Price List must be provided')

  item.prototype.getPrice = (priceInfo, ignoreDiscount) ->
    marketCode = priceInfo.marketCode

    if @_priceList?.prices?[marketCode]? && !(priceInfo.isTrial && @_data.trialItem)
      price = BigNumber(@_priceList.prices[marketCode])
      if !ignoreDiscount
         if priceInfo.itemDiscountApplied && @_data.itemDiscount
          price = price.minus(price.times(@_data.itemDiscount))

        if priceInfo.coupon?.valid
          if priceInfo.coupon.percent_off
            price = price.minus(price.times(priceInfo.coupon.percent_off / 100).decimalPlaces(2))
          else
            if priceInfo.coupon.amount_off
              price = price.minus(priceInfo.coupon.amount_off / 100)

      price
    else
      0

  item.prototype.setQuantity = (quantity, relative) ->
    quantity = parseInt(quantity)
    if (quantity % 1 is 0)
      if (relative is true)
        @_quantity += quantity
      else
        @_quantity = quantity

      if (this._quantity < 1)
        @_quantity = 1

    else
      @_quantity = 1
      console.info('Quantity must be an integer and was defaulted to 1')
    $rootScope.$broadcast('giCart:change', {})

  item.prototype.getQuantity = () ->
    @_quantity

  item.prototype.setData = (data) ->
    if (data)
      @_data = data
    return

  item.prototype.getData = () ->
    if @_data?
      return @_data;
    else
      console.info('This item has no data')
      return

  item.prototype.getSubTotal = (priceInfo, ignoreDiscount) ->
    itemPrice = @getPrice(priceInfo, ignoreDiscount)
    if priceInfo.taxRate > 0 and priceInfo.taxInclusive
      itemPrice = itemPrice.div(1 + (priceInfo.taxRate / 100))

    +itemPrice.times(@getQuantity()).toFixed(2)

  item.prototype.getTaxTotal = (priceInfo, ignoreDiscount) ->
    if priceInfo.taxRate > 0 and not (priceInfo.taxExempt)
      itemPrice = @getPrice(priceInfo, ignoreDiscount)
      taxTotal = 0
      if priceInfo.taxInclusive
        taxTotal = itemPrice.minus(itemPrice.div(1 + (priceInfo.taxRate / 100)))
      else
        taxTotal = itemPrice.times(priceInfo.taxRate / 100)

      +taxTotal.times(@getQuantity()).toFixed(2)
    else
      0

  item.prototype.getTotal =  (priceInfo, ignoreDiscount) ->
    itemPrice = @getPrice(priceInfo, ignoreDiscount)
    if priceInfo.taxRate > 0
      if priceInfo.taxInclusive
        if priceInfo.taxExempt
          itemPrice = itemPrice.div(1 + (priceInfo.taxRate / 100))
      else
        itemPrice = itemPrice.plus(itemPrice.times(priceInfo.taxRate / 100))
    +itemPrice.times(@getQuantity()).toFixed(2)

  item.prototype.needsShipping = () ->
    @_data.physical

  item

]
