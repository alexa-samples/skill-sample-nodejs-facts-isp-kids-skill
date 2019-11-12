
/* CONSTANTS */
const Alexa = require('ask-sdk');

/*
    Static list of facts across 3 categories that serve as
    the free and premium content served by the Skill
*/
const ALL_FACTS = [
  { type: 'free', fact: 'There are 365 days in a year, except leap years, which have 366 days.' },
  { type: 'free', fact: 'What goes up, must come down.  Except when it doesn\'t.' },
  { type: 'free', fact: 'Two wrongs don\'t make a right, but three lefts do.' },
  { type: 'free', fact: 'There are 24 hours in a day.' },
  { type: 'science', fact: 'There is enough DNA in an average person\'s body to stretch from the sun to Pluto and back — 17 times.' },
  { type: 'science', fact: 'The average human body carries ten times more bacterial cells than human cells.' },
  { type: 'science', fact: 'It can take a photon 40,000 years to travel from the core of the sun to its surface, but only 8 minutes to travel the rest of the way to Earth.' },
  { type: 'science', fact: 'At over 2000 kilometers long, The Great Barrier Reef is the largest living structure on Earth.' },
  { type: 'science', fact: 'There are 8 times as many atoms in a teaspoonful of water as there are teaspoonfuls of water in the Atlantic ocean.' },
  { type: 'science', fact: 'The average person walks the equivalent of five times around the world in a lifetime.' },
  { type: 'science', fact: 'When Helium is cooled to absolute zero it flows against gravity and will start running up and over the lip of a glass container!' },
  { type: 'science', fact: 'An individual blood cell takes about 60 seconds to make a complete circuit of the body.' },
  { type: 'science', fact: 'The longest cells in the human body are the motor neurons. They can be up to 4.5 feet (1.37 meters) long and run from the lower spinal cord to the big toe.' },
  { type: 'science', fact: 'The human eye blinks an average of 4,200,000 times a year.' },
  { type: 'history', fact: 'The Hundred Years War actually lasted 116 years from thirteen thirty seven to fourteen fifty three.' },
  { type: 'history', fact: 'There are ninety two known cases of nuclear bombs lost at sea.' },
  { type: 'history', fact: 'Despite popular belief, Napoleon Bonaparte stood 5 feet 6 inch tall. Average height for men at the time.' },
  { type: 'history', fact: 'Leonardo Da Vinci designed the first helicopter, tank, submarine, parachute and ammunition igniter... Five hundred years ago.' },
  { type: 'history', fact: 'The shortest war on record was fought between Zanzibar and England in eighteen ninety six. Zanzibar surrendered after 38 minutes.' },
  { type: 'history', fact: 'X-rays of the Mona Lisa show that there are 3 different versions under the present one.' },
  { type: 'history', fact: 'At Andrew Jackson\'s funeral in 1845, his pet parrot had to be removed because it was swearing too much.' },
  { type: 'history', fact: 'English was once a language for “commoners,” while the British elites spoke French.' },
  { type: 'history', fact: 'In ancient Egypt, servants were smeared with honey in order to attract flies away from the pharaoh.' },
  { type: 'history', fact: 'Ronald Reagan was a lifeguard during high school and saved 77 people’s lives.' },
  { type: 'space', fact: 'A year on Mercury is just 88 days long.' },
  { type: 'space', fact: 'Despite being farther from the Sun, Venus experiences higher temperatures than Mercury.' },
  { type: 'space', fact: 'Venus rotates anti-clockwise, possibly because of a collision in the past with an asteroid.' },
  { type: 'space', fact: 'On Mars, the Sun appears about half the size as it does on Earth.' },
  { type: 'space', fact: 'Earth is the only planet not named after a god.' },
  { type: 'space', fact: 'Jupiter has the shortest day of all the planets.' },
  { type: 'space', fact: 'The Milky Way galaxy will collide with the Andromeda Galaxy in about 5 billion years.' },
  { type: 'space', fact: 'The Sun contains 99.86% of the mass in the Solar System.' },
  { type: 'space', fact: 'The Sun is an almost perfect sphere.' },
  { type: 'space', fact: 'A total solar eclipse can happen once every 1 to 2 years. This makes them a rare event.' },
];

const UpsellCounter = 2;

/* HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    console.log('IN: LaunchRequestHandler.handle');
    // entitled products are obtained by request interceptor and stored in the session attributes
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const entitledProducts = sessionAttributes.entitledProducts;

    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const locale = handlerInput.requestEnvelope.request.locale;

    let speakOutput = 'Hello, this is welcome prompt. In this game you can hear random fact. You could say, \'Tell me a random fact\'. ';
    const repromptOutput = 'I didn\'t catch that. What can I help you with?';

    /*
      Note that below prompts are for demo purpose only.
      Please think through your skill design
      and replacing following prompts with your specific use case.
    */
    if (entitledProducts && entitledProducts.length > 0) {
      // welcome message template for customer that owning premium contents,
      speakOutput += `By the way, you currently own ${getSpeakableListOfProducts(entitledProducts)}. `;
    }

    const ispProductsInfo = await ms.getInSkillProducts(locale);
    const historyCategoryProduct = ispProductsInfo.inSkillProducts.filter((record) => record.referenceName === 'history_pack');

    /*
      child directed skill inSkillProductsTransactions API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const ISPTransactions = await ms.getInSkillProductsTransactions(locale);
    const pendingHistoryFact = ISPTransactions.results.filter((record) => record.productId === historyCategoryProduct[0].productId && record.status === 'PENDING_APPROVAL_BY_PARENT');
    if (pendingHistoryFact && pendingHistoryFact.length > 0) {
      speakOutput += `By the way, I am still waiting for permission to unlock ${historyCategoryProduct[0].name}, would you like a random fact now?`;
    } else {
      speakOutput += 'What fact would you like hear?';
    }

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  async handle(handlerInput) {
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    /*
      child directed skill voicePurchasing API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const voicePurchaseSetting = await ms.getVoicePurchaseSetting();

    /*
      Note that below prompts are for demo purpose only.
      Please think through your skill design
      and replacing following prompts with your specific use case.
    */
    let speakOutput = 'To hear a random fact, you could say, \'Tell me a fact\' or you can ask'
      + ' for a specific category you have purchased, for example, say \'Tell me a history fact\'. ';
    const repromptOutput = 'I didn\'t catch that. What can I help you with?';
    if (voicePurchaseSetting) {
      speakOutput += ' To know what else you can buy, say, \'What can i buy?\'. So, what can I help you with?';
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

// IF THE USER SAYS YES, THEY WANT ANOTHER FACT.
const YesHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
     && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
       || handlerInput.requestEnvelope.request.intent.name === 'GetRandomFactIntent');
  },
  async handle(handlerInput) {
    console.log('In YesHandler');
    const filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    let upsellCounter = sessionAttributes.upsellCounter;

    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const locale = handlerInput.requestEnvelope.request.locale;
    /*
      child directed skill voicePurchasing API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const voicePurchaseSetting = await ms.getVoicePurchaseSetting();

    if (voicePurchaseSetting && upsellCounter === 0) {
      // natural upsell if upsell counter reached zero
      // (in this demo it implies an upsell after 3 random facts are played)

      const ispProductsInfo = await ms.getInSkillProducts(locale);
      const historyFactProduct = ispProductsInfo.inSkillProducts.filter((record) => record.referenceName === 'history_pack');

      /*
        child directed skill inSkillProductsTransactions API
        doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
      */
      const ISPTransactions = await ms.getInSkillProductsTransactions(locale);
      const historyFactpendingTransaction = ISPTransactions.results.filter((record) => record.productId === historyFactProduct[0].productId && record.status === 'PENDING_APPROVAL_BY_PARENT');

      // only upsell if customer currently not owning history pack, or has pending transaction
      if (!isEntitled(historyFactProduct) && historyFactpendingTransaction.length === 0) {
        const upsellMessage = `Here's your random fact: ${getRandomFact(filteredFacts)}. There is a new history pack waiting to unlock with new facts about history. Would you like to learn more?`;
        return handlerInput.responseBuilder
          .addDirective({
            type: 'Connections.SendRequest',
            name: 'Upsell',
            payload: {
              InSkillProduct: {
                productId: historyFactProduct[0].productId,
              },
              upsellMessage: upsellMessage,
            },
            token: 'correlationToken',
          }).getResponse();
      }
    }

    // if voice purchasing is turned ON, deduct upsell counter value, update session attribtue,
    // then give a random fact if voice purchase setting is ON
    if (voicePurchaseSetting) {
      upsellCounter -= 1;
      sessionAttributes.upsellCounter = upsellCounter;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }

    // reduce fact list to those purchased
    const speakOutput = `Here's your random fact: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
    const repromptOutput = getRandomYesNoQuestion();

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

// IF THE USER SAYS NO, THEY DON'T WANT ANOTHER FACT.  EXIT THE SKILL.
const NoHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    console.log('IN: NoHandler.handle');

    const speakOutput = getRandomGoodbye();
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const GetCategoryFactHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetCategoryFactIntent';
  },
  async handle(handlerInput) {
    console.log('In GetCategoryFactHandler');

    const factCategory = getResolvedValue(handlerInput.requestEnvelope, 'factCategory');
    let categoryFacts = ALL_FACTS;

    // IF THERE WAS NOT AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
    if (factCategory === undefined) {
      const slotValue = getSpokenValue(handlerInput.requestEnvelope, 'factCategory');
      let speakPrefix = '';
      if (slotValue !== undefined) speakPrefix = `I heard you say ${slotValue}. `;
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      const speakOutput = `${speakPrefix} I don't have facts for that category.  You can ask for science, space, or history facts.  Which one would you like?`;
      const repromptOutput = 'Which fact category would you like?  I have science, space, or history.';

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // these are all used somewhere in the switch statement
    let speakOutput;
    let repromptOutput;
    let upsellMessage;
    let locale;
    let ms;
    let categoryProduct;

    const filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
    switch (factCategory) {
      case 'free': {
        // don't need to buy 'free' category, so give what was asked
        categoryFacts = ALL_FACTS.filter((record) => record.type === factCategory);
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        speakOutput = `Here's your ${factCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
        repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      case 'random':
      case 'all_access': {
        // choose from the available facts based on entitlements
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        speakOutput = `Here's your random fact: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
        repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      default: {
        // IF THERE WAS AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
        categoryFacts = ALL_FACTS.filter((record) => record.type === factCategory);
        locale = handlerInput.requestEnvelope.request.locale;
        ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        const ispProductsInfo = await ms.getInSkillProducts(locale);
        categoryProduct = ispProductsInfo.inSkillProducts.filter((record) => record.referenceName === `${factCategory}_pack`);

        // 1. no category for what was requested either product not created or not available
        if (!categoryProduct[0]) {
          console.log(`ALERT!  The category **${factCategory}** seemed to be valid, but no matching product was found. `
            + ' This could be due to no ISPs being created and linked to the skill, the ISPs being created '
            + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `I'm having trouble accessing the ${factCategory} facts right now.  Try a different category for now.  ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }


        // 2. check if user has access to this product
        if (isEntitled(categoryProduct)) {
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `Here's your ${factCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }

        // 3. check if the requested ISP is in pending state
        /*
          child directed skill inSkillProductsTransactions API
          doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
        */
        const ISPTransactions = await ms.getInSkillProductsTransactions(locale);
        const pendingTransactionsInUpsell = ISPTransactions.results.filter((record) => record.productId === categoryProduct[0].productId && record.status === 'PENDING_APPROVAL_BY_PARENT');
        if (pendingTransactionsInUpsell && pendingTransactionsInUpsell.length > 0) {
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `Your ${categoryProduct[0].name} is still pending purchase approval, you can continue hear other random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }

        // 4. check purchase setting
        /*
          child directed skill voicePurchasing API
          doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
        */
        const voicePurchaseSetting = await ms.getVoicePurchaseSetting();
        if (!voicePurchaseSetting) {
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `I am sorry, that's not available. You can still play other random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }

        // 5. ready to upsell
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        upsellMessage = `You don't currently own the ${factCategory} pack. ${categoryProduct[0].summary} Want to learn more?`;
        return handlerInput.responseBuilder
          .addDirective({
            type: 'Connections.SendRequest',
            name: 'Upsell',
            payload: {
              InSkillProduct: {
                productId: categoryProduct[0].productId,
              },
              upsellMessage: upsellMessage,
            },
            token: 'correlationToken',
          })
          .getResponse();
      }
    }
  },
};


// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts what can i buy
const WhatCanIBuyHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'WhatCanIBuyIntent';
  },
  async handle(handlerInput) {
    console.log('In WhatCanIBuy Handler');

    // Inform the user about what products are available for purchase
    let speakOutput = '';
    let repromptOutput;
    const filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    // check currently owned content
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const entitledProducts = sessionAttributes.entitledProducts;


    if (entitledProducts && entitledProducts.length > 0) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput = `You currently own ${getSpeakableListOfProducts(entitledProducts)}. `;
    }

    // check voice purchasing toggle
    /*
      child directed skill voicePurchasing API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const voicePurchaseSetting = await ms.getVoicePurchaseSetting();
    if (!voicePurchaseSetting) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput += `I am sorry, no prodcuts found available. You can still play random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
      repromptOutput = getRandomYesNoQuestion();
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    const ispProductsInfo = await ms.getInSkillProducts(locale);
    const purchasableProducts = ispProductsInfo.inSkillProducts.filter((record) => record.entitled === 'NOT_ENTITLED' && record.purchasable === 'PURCHASABLE');


    if (purchasableProducts.length > 0) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput += `Products available for purchase at this time are ${getSpeakableListOfProducts(purchasableProducts)}`
        + '. To learn more about a product, say \'Tell me more about\' followed by the product name. '
        + ' If you are ready to buy say \'Buy\' followed by the product name. So what can I help you with?';
      repromptOutput = 'I didn\'t catch that. What can I help you with?';

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }
    // no products!
    console.log('!!! ALERT !!!  The product list came back as empty.  This could be due to no ISPs being created and linked to the skill, the ISPs being created '
      + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

    speakOutput += 'no prodcuts found available to purchase. Would you like a random fact now?';
    repromptOutput = 'I didn\'t catch that. What can I help you with?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts to tell me about the history pack
const ProductDetailHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ProductDetailIntent';
  },
  async handle(handlerInput) {
    console.log('IN PRODUCT DETAIL HANDLER');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    const ispProductsInfo = await ms.getInSkillProducts(locale);

    const productCategory = getResolvedValue(handlerInput.requestEnvelope, 'productCategory');
    const spokenCategory = getSpokenValue(handlerInput.requestEnvelope, 'productCategory');
    let speakOutput;
    let repromptOutput;

    // nothing spoken for the slot value
    if (spokenCategory === undefined) {
      return handlerInput.responseBuilder
        .addDelegateDirective()
        .getResponse();
    }

    // NO ENTITY RESOLUTION MATCH
    if (productCategory === undefined) {
      return handlerInput.responseBuilder
        .speak('I don\'t think we have a product by that name.  Can you try again?')
        .reprompt('I didn\'t catch that. Can you try again?')
        .getResponse();
    }

    const categoryFacts = ALL_FACTS.filter((record) => record.type === productCategory);
    const categoryProduct = ispProductsInfo.inSkillProducts.filter((record) => record.referenceName === `${productCategory}_pack`);

    // 1. no category for what was requested either product not created or not available
    if (!categoryProduct[0]) {
      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');
      return handlerInput.responseBuilder
        .speak('I can\'t find a product by that name.  Can you try again?')
        .reprompt('I didn\'t catch that. Can you try again?')
        .getResponse();
    }

    // 2. check if user has access to this product
    if (isEntitled(categoryProduct)) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput = `${categoryProduct[0].summary}. Here's your ${productCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
      repromptOutput = getRandomYesNoQuestion();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 3. check if the requested ISP is in pending state
    /*
      child directed skill inSkillProductsTransactions API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const ISPTransactions = await ms.getInSkillProductsTransactions(locale);
    const pendingTransactionsInUpsell = ISPTransactions.results.filter((record) => record.productId === categoryProduct[0].productId && record.status === 'PENDING_APPROVAL_BY_PARENT');
    if (pendingTransactionsInUpsell && pendingTransactionsInUpsell.length > 0) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput = `${categoryProduct[0].summary}. Your ${categoryProduct[0].name} is still pending purchase approval, would you want a random fact? `;
      repromptOutput = getRandomYesNoQuestion();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 4. check purchase setting
    /*
      child directed skill voicePurchasing API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const voicePurchaseSetting = await ms.getVoicePurchaseSetting();
    if (!voicePurchaseSetting) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      speakOutput = `${categoryProduct[0].summary}. Would you want a random fact? `;
      repromptOutput = getRandomYesNoQuestion();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 5. ready to upsell
    /*
      Note that below prompts are for demo purpose only.
      Please think through your skill design
      and replacing following prompts with your specific use case.
    */
    const upsellMessage = `${categoryProduct[0].summary}. You don't currently own the ${categoryProduct[0].name}. Want to learn more?`;
    return handlerInput.responseBuilder
      .addDirective({
        type: 'Connections.SendRequest',
        name: 'Upsell',
        payload: {
          InSkillProduct: {
            productId: categoryProduct[0].productId,
          },
          upsellMessage: upsellMessage,
        },
        token: 'correlationToken',
      }).getResponse();
  },
};

// Following handler demonstrates how Skills would receive Buy requests from customers
// and then trigger a Purchase flow request to Alexa
const BuyHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'BuyIntent';
  },
  async handle(handlerInput) {
    console.log('IN: BuyHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    const factCategory = getResolvedValue(handlerInput.requestEnvelope, 'productCategory');

    // 1. get requested product id
    const ispProductsInfo = await ms.getInSkillProducts(locale);
    const requestedIsp = getRequestedProduct(handlerInput.requestEnvelope, ispProductsInfo);

    if (requestedIsp.length === 0) {
      console.log('!!! ALERT !!!  The requested product could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created '
        + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

      return handlerInput.responseBuilder
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        .speak('I don\'t think we have a product by that name.  Can you try again?')
        .reprompt('I didn\'t catch that. Can you try again?')
        .getResponse();
    }

    // 2. check if user has access to this product
    if (isEntitled(requestedIsp)) {
      const categoryFacts = ALL_FACTS.filter((record) => record.type === factCategory);
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      const speakOutput = `Good news, you already own ${factCategory} fact. Here's your ${factCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
      const repromptOutput = getRandomYesNoQuestion();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 3. check if the requested ISP is in pending state
    const requestedProductId = requestedIsp[0].productId;
    /*
      child directed skill inSkillProductsTransactions API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const ISPTransactions = await ms.getInSkillProductsTransactions(locale);
    const pendingTransactions = ISPTransactions.results.filter((record) => record.productId === requestedProductId && record.status === 'PENDING_APPROVAL_BY_PARENT');
    const filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);

    if (pendingTransactions && pendingTransactions.length > 0) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      const speakOutput = `Your ${requestedIsp[0].name} is still pending purchase approval, you can continue hear random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
      const repromptOutput = getRandomYesNoQuestion();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 4. check purchase setting
    /*
      child directed skill voicePurchasing API
      doc: https://developer.integ.amazon.com/docs/in-skill-purchase/isp-kid-skills.html
    */
    const voicePurchaseSetting = await ms.getVoicePurchaseSetting();
    if (!voicePurchaseSetting) {
      /*
        Note that below prompts are for demo purpose only.
        Please think through your skill design
        and replacing following prompts with your specific use case.
      */
      const speakOutput = `I am sorry, that's not available. You can still play random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
      const repromptOutput = getRandomYesNoQuestion();
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // 5. initiate purchase
    return handlerInput.responseBuilder
      .addDirective({
        type: 'Connections.SendRequest',
        name: 'Buy',
        payload: {
          InSkillProduct: {
            productId: requestedProductId,
          },
        },
        token: 'correlationToken',
      })
      .getResponse();
  },
};

// Following handler demonstrates how Skills would receive Cancel requests from customers
// and then trigger a cancel request to Alexa
// User says: Alexa, ask <skill name> to cancel <product name>
const CancelSubscriptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'CancelSubscriptionIntent';
  },
  async handle(handlerInput) {
    console.log('IN: CancelSubscriptionHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    const ispProductsInfo = await ms.getInSkillProducts(locale);
    let productCategory = getResolvedValue(handlerInput.requestEnvelope, 'productCategory');

    if (productCategory === undefined) {
      productCategory = 'all_access';
    } else if (productCategory !== 'all_access') {
      productCategory += '_pack';
    }

    const product = ispProductsInfo.inSkillProducts
      .filter((record) => record.referenceName === productCategory);

    if (product.length > 0) {
      if (!isEntitled(product)) {
        return handlerInput.responseBuilder
          .speak(`I am sorry, you don't own ${product[0].name}. Would you like a random fact?`)
          .reprompt('I didn\'t catch that. Can you try again?')
          .getResponse();
      }
      return handlerInput.responseBuilder
        .addDirective({
          type: 'Connections.SendRequest',
          name: 'Cancel',
          payload: {
            InSkillProduct: {
              productId: product[0].productId,
            },
          },
          token: 'correlationToken',
        })
        .getResponse();
    }

    // requested product didn't match something from the catalog
    console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
      + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

    return handlerInput.responseBuilder
      .speak('I don\'t think we have a product by that name.  Can you try again?')
      .reprompt('I didn\'t catch that. Can you try again?')
      .getResponse();
  },
};

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A BUY or UPSELL OCCURS.
const BuyResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'Connections.Response'
      && (handlerInput.requestEnvelope.request.name === 'Buy'
        || handlerInput.requestEnvelope.request.name === 'Upsell');
  },
  async handle(handlerInput) {
    console.log('IN: BuyResponseHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    const ispProductsInfo = await ms.getInSkillProducts(locale);
    const product = ispProductsInfo.inSkillProducts
      .filter((record) => record.productId === productId);
    console.log(`PRODUCT = ${JSON.stringify(product)}`);
    if (handlerInput.requestEnvelope.request.status.code === '200') {
      let speakOutput;
      let repromptOutput;
      let filteredFacts;
      let categoryFacts = ALL_FACTS;
      switch (handlerInput.requestEnvelope.request.payload.purchaseResult) {
        case 'PENDING_PURCHASE':
          filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `While waiting for your ${product[0].name} purchase approval, you can continue hear random fact. Here we go: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
          break;
        case 'ACCEPTED':
          if (product[0].referenceName !== 'all_access') categoryFacts = ALL_FACTS.filter((record) => record.type === product[0].referenceName.replace('_pack', ''));
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `You have unlocked the ${product[0].name}.  Here is your ${product[0].referenceName.replace('_pack', '').replace('all_access', '')} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
          break;
        case 'DECLINED':
          if (handlerInput.requestEnvelope.request.name === 'Buy') {
            // response when declined buy request
            /*
              Note that below prompts are for demo purpose only.
              Please think through your skill design
              and replacing following prompts with your specific use case.
            */
            speakOutput = `Thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
            repromptOutput = 'Would you like another random fact?';
            break;
          }
          // response when declined upsell request
          filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `No Problem. You can continue play random fact, Here's one: ${getRandomFact(filteredFacts)} Would you like another random fact?`;
          repromptOutput = 'Would you like another random fact?';
          break;
        case 'ALREADY_PURCHASED':
          // may have access to more than what was asked for, but give them a random
          // fact from the product they asked to buy
          if (product[0].referenceName !== 'all_access') categoryFacts = ALL_FACTS.filter((record) => record.type === product[0].referenceName.replace('_pack', ''));

          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `Here is your ${product[0].referenceName.replace('_pack', '').replace('all_access', '')} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
          break;
        default:
          console.log(`unhandled purchaseResult: ${handlerInput.requestEnvelope.payload.purchaseResult}`);
          /*
            Note that below prompts are for demo purpose only.
            Please think through your skill design
            and replacing following prompts with your specific use case.
          */
          speakOutput = `Something unexpected happened, but thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
          repromptOutput = 'Would you like another random fact?';
          break;
      }
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }
    // Something failed.
    console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

    return handlerInput.responseBuilder
      .speak('There was an error handling your purchase request. Please try again or contact us for help.')
      .getResponse();
  },
};

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A CANCEL OCCURS.
const CancelResponseHandler = {
  canHandle(handlerInput) {
    console.log('IN: CancelResponseHandler.canHandle');
    console.log(handlerInput);

    return handlerInput.requestEnvelope.request.type === 'Connections.Response'
      && handlerInput.requestEnvelope.request.name === 'Cancel';
  },
  async handle(handlerInput) {
    console.log('IN: CancelResponseHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    const ispProductsInfo = await ms.getInSkillProducts(locale);
    const product = ispProductsInfo.inSkillProducts
      .filter((record) => record.productId === productId);
    console.log(`PRODUCT = ${JSON.stringify(product)}`);
    if (handlerInput.requestEnvelope.request.status.code === '200') {
      if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        const speakOutput = `We just sent a card on your Alexa app about refund instructions. ${getRandomYesNoQuestion()}`;
        const repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'NOT_ENTITLED') {
        /*
          Note that below prompts are for demo purpose only.
          Please think through your skill design
          and replacing following prompts with your specific use case.
        */
        const speakOutput = `You don't currently have an in skill product to cancel. ${getRandomYesNoQuestion()}`;
        const repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
    }
    // Something failed.
    console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

    return handlerInput.responseBuilder
      .speak('There was an error handling your purchase request. Please try again or contact us for help.')
      .getResponse();
  },
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'
      || (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent')
      || (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    console.log('IN: SessionEndedHandler.handle');
    return handlerInput.responseBuilder
      .speak(getRandomGoodbye())
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    console.log('IN FallbackHandler');
    return handlerInput.responseBuilder
      .speak('Sorry, I didn\'t understand what you meant. Please try again.')
      .reprompt('Sorry, I didn\'t understand what you meant. Please try again.')
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${JSON.stringify(error.message)}`);
    console.log(`handlerInput: ${JSON.stringify(handlerInput)}`);
    return handlerInput.responseBuilder
      .speak('Sorry, I didn\'t understand what you meant. Please try again.')
      .reprompt('Sorry, I didn\'t understand what you meant. Please try again.')
      .getResponse();
  },
};

/* FUNCTIONS */
function getAllEntitledProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter((record) => record.entitled === 'ENTITLED');
  console.log(`Currently entitled products: ${JSON.stringify(entitledProductList)}`);
  return entitledProductList;
}

function getRandomFact(facts) {
  const factIndex = Math.floor(Math.random() * facts.length);
  return facts[factIndex].fact;
}

function getRandomYesNoQuestion() {
  const questions = ['Would you like another fact?', 'Can I tell you another fact?', 'Do you want to hear another fact?'];
  return questions[Math.floor(Math.random() * questions.length)];
}

function getRandomGoodbye() {
  const goodbyes = ['OK.  Goodbye!', 'Have a great day!', 'Come back again soon!'];
  return goodbyes[Math.floor(Math.random() * goodbyes.length)];
}

function getFilteredFacts(factsToFilter, handlerInput) {
  // lookup entitled products, and filter accordingly
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const entitledProducts = sessionAttributes.entitledProducts;
  let factTypesToInclude;
  if (entitledProducts) {
    factTypesToInclude = entitledProducts.map((item) => item.name.toLowerCase().replace(' pack', ''));
    factTypesToInclude.push('free');
  } else {
    // no entitled products, so just give free ones
    factTypesToInclude = ['free'];
  }
  console.log(`types to include: ${factTypesToInclude}`);
  if (factTypesToInclude.indexOf('all access') >= 0) {
    return factsToFilter;
  }
  const filteredFacts = factsToFilter
    .filter((record) => factTypesToInclude.indexOf(record.type) >= 0);

  return filteredFacts;
}
/*
    Helper function that returns a speakable list of product names from a list of
    entitled products.
*/
function getSpeakableListOfProducts(entitleProductsList) {
  const productNameList = entitleProductsList.map((item) => item.name);
  let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
  return productListSpeech;
}

/* helper function returning ISP object that user requested in dialog slot */
function getRequestedProduct(requestEnvelope, ispProductsInfo) {
  let productCategory = getResolvedValue(requestEnvelope, 'productCategory');

  if (productCategory === undefined) {
    productCategory = 'all_access';
  } else if (productCategory !== 'all_access') {
    productCategory += '_pack';
  }

  const requestedIsp = ispProductsInfo.inSkillProducts
    .filter((record) => record.referenceName === productCategory);

  return requestedIsp;
}

function getResolvedValue(requestEnvelope, slotName) {
  if (requestEnvelope
    && requestEnvelope.request
    && requestEnvelope.request.intent
    && requestEnvelope.request.intent.slots
    && requestEnvelope.request.intent.slots[slotName]
    && requestEnvelope.request.intent.slots[slotName].resolutions
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0]
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0]
      .values[0]
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0]
      .values[0].value
    && requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0]
      .values[0].value.name) {
    return requestEnvelope.request.intent.slots[slotName].resolutions
      .resolutionsPerAuthority[0].values[0].value.name;
  }
  return undefined;
}

function getSpokenValue(requestEnvelope, slotName) {
  if (requestEnvelope
    && requestEnvelope.request
    && requestEnvelope.request.intent
    && requestEnvelope.request.intent.slots
    && requestEnvelope.request.intent.slots[slotName]
    && requestEnvelope.request.intent.slots[slotName].value) {
    return requestEnvelope.request.intent.slots[slotName].value;
  }
  return undefined;
}

function isProduct(product) {
  return product && product.length > 0;
}

function isEntitled(product) {
  return isProduct(product) && product[0].entitled === 'ENTITLED';
}

const RequestLog = {
  process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const EntitledProductsCheck = {
  async process(handlerInput) {
    if (handlerInput.requestEnvelope.session.new === true) {
      // new session, check to see what products are already owned.
      try {
        const locale = handlerInput.requestEnvelope.request.locale;
        const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const result = await ms.getInSkillProducts(locale);
        const entitledProducts = getAllEntitledProducts(result.inSkillProducts);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.entitledProducts = entitledProducts;
        sessionAttributes.upsellCounter = UpsellCounter;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      } catch (error) {
        console.log(`Error calling InSkillProducts API: ${error}`);
      }
    }
  },
};

const ResponseLog = {
  process(handlerInput) {
    console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  },
};

exports.handler = Alexa.SkillBuilders.standard()
  .addRequestHandlers(
    LaunchRequestHandler,
    YesHandler,
    NoHandler,
    GetCategoryFactHandler,
    BuyResponseHandler,
    CancelResponseHandler,
    WhatCanIBuyHandler,
    ProductDetailHandler,
    BuyHandler,
    CancelSubscriptionHandler,
    SessionEndedHandler,
    HelpHandler,
    FallbackHandler,
  )
  .addRequestInterceptors(
    RequestLog,
    EntitledProductsCheck,
  )
  .addResponseInterceptors(ResponseLog)
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('sample/premium-fact/v1')
  .lambda();
