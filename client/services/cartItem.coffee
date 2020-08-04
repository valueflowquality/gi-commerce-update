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
      if !priceInfo.coupon?.valid || ignoreDiscount
        @_priceList.prices[marketCode]
      else
        if priceInfo.coupon.percent_off
          @_priceList.prices[marketCode] - (Math.round((@_priceList.prices[marketCode] / 100 * priceInfo.coupon.percent_off) * 100) / 100)
        else
          if priceInfo.coupon.amount_off
            @_priceList.prices[marketCode] - (priceInfo.coupon.amount_off / 100)

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
      itemPrice = itemPrice / (1 + (priceInfo.taxRate / 100))

    +(@getQuantity() * itemPrice).toFixed(2)

  item.prototype.getTaxTotal = (priceInfo, ignoreDiscount) ->
    if priceInfo.taxRate > 0 and not (priceInfo.taxExempt)
      itemPrice = @getPrice(priceInfo, ignoreDiscount)
      taxTotal = 0
      if priceInfo.taxInclusive
        taxTotal = itemPrice - (itemPrice / (1 + (priceInfo.taxRate / 100)))
      else
        taxTotal = itemPrice * (priceInfo.taxRate / 100)

      +(@getQuantity() * taxTotal).toFixed(2)
    else
      0

  item.prototype.getTotal =  (priceInfo, ignoreDiscount) ->
    @getSubTotal(priceInfo, ignoreDiscount) + @getTaxTotal(priceInfo, ignoreDiscount)

  item.prototype.needsShipping = () ->
    @_data.physical

  item

]
