angular.module('gi.commerce').factory 'giPayment'
, [ '$q', '$http'
, ($q, $http) ->

  stripe:
    setKey: (key) ->
      Stripe.setPublishableKey(key)

    getToken: (card) ->
      deferred = $q.defer()

      stripeCard =
        number: card.number
        cvc: card.security

      exp = /^(0[1-9]|1[0-2])\/?(?:20)?([0-9]{2})$/
      match = exp.exec(card.expiry)
      if match?
        stripeCard.exp_month = match[1]
        stripeCard.exp_year = "20" + match[2]

      Stripe.card.createToken stripeCard, (status, response) ->
        if response.error?
          deferred.reject response.error.message
        else
          deferred.resolve(response)
      deferred.promise

    mountElement: (id, cart) ->
      stripe = Stripe(vfq.stripePubKey)
      elements = stripe.elements()
      card = elements.create('card')
      cart.cardElement = cart
      cart.stripe = stripe
      card.mount(id)

    createIntent: (chargeRequest) ->
      deferred = $q.defer()

      $http.post('/api/makeIntent', chargeRequest)
      .success (client_secret) ->
        deferred.resolve client_secret
      .error (data) ->
        msg = 'payment not completed'
        if data.message?
          msg = data.message
        deferred.reject msg

      deferred.promise

    charge: (chargeRequest) ->
      deferred = $q.defer()
      
      $http.post('/api/checkout', chargeRequest)
      .success () ->
        deferred.resolve 'payment completed'
      .error (data) ->
        msg = 'payment not completed'
        if data.message?
          msg = data.message
        deferred.reject msg

      deferred.promise
]
