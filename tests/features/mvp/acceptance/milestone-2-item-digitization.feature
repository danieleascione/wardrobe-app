@milestone_2
Feature: Camera-based item digitization with AI metadata extraction
  As a PocketWardrobe user
  I want to photograph my clothes and have the app recognise them automatically
  So that I can build my wardrobe without manually entering every detail

  # US-02: Camera-Based Item Digitization
  # Driving port: ItemDigitizationPort
  # Commands: InitiateDigitization, ConfirmItem, CorrectMetadata, DeleteItem
  # Mocked outbound: AIProcessorPort (Nano Banana), ImageStorePort (S3), FaceDetectionPort

  Background:
    Given Sofia has completed style calibration
    And she has granted photo storage consent

  @smoke
  Scenario: Sofia photographs her camel trench coat and it is classified correctly
    Given Sofia is on the item capture screen
    And the AI service is available and returns a confident classification
    When she captures a well-lit photo of her camel trench coat laid flat
    Then the photo is processed within 10 seconds
    And the background-removed image of the coat is displayed
    And the suggested item details show:
      | Name            | Camel Wool Coat          |
      | Colour          | Camel / Warm tan         |
      | Category        | Outerwear                |
      | Subcategory     | Coat                     |
      | Seasons         | Spring/Autumn, Winter    |
      | Occasions       | Work, Casual             |
    And all fields are editable before she confirms
    And an "Add to wardrobe" button is displayed

  @smoke
  Scenario: Item count increases only after Sofia confirms an item
    Given Sofia's wardrobe has 2 confirmed items
    When she captures a photo and the AI finishes processing
    Then her wardrobe still shows 2 items
    When she taps "Add to wardrobe"
    Then her wardrobe shows 3 items

  @edge-case
  Scenario: Sofia selects a photo from her gallery instead of using the camera
    Given Sofia is on the item capture screen
    When she chooses to import from her photo gallery
    And selects an existing photo of her dark slim jeans
    Then the photo is processed by the AI identically to a camera capture
    And within 10 seconds she sees suggested details for the jeans
    And the category shows "Bottoms" and subcategory "Jeans"
    And she can confirm or edit before adding to her wardrobe

  @edge-case
  Scenario: Sofia corrects an AI category error before saving
    Given Sofia's linen blazer photo has been processed
    And the AI has suggested category "Tops" and subcategory "Blouse"
    When Sofia reviews the suggested details
    And she changes the category to "Outerwear" and subcategory to "Blazer"
    And taps "Add to wardrobe"
    Then the item is saved with category "Outerwear" and subcategory "Blazer"
    And the correction is logged so the AI can improve over time

  @pending
  @edge-case
  Scenario: Sofia photographs an item in poor lighting and is prompted to retake
    Given Sofia is on the item capture screen
    When she captures a photo in insufficient lighting
    Then the photo is not submitted for AI processing
    And she sees a message "This photo looks a bit dark — retake for better results?"
    And she is offered "Retake" and "Use anyway" options
    When she taps "Retake"
    Then the camera is shown again for a new capture

  @pending
  @edge-case
  Scenario: Sofia taps "Use anyway" after the low-lighting warning and the flow continues
    Given Sofia has seen the low-lighting warning for her photo
    When she taps "Use anyway"
    Then the photo is submitted for AI processing
    And the normal item review flow continues

  @pending
  @error-path
  Scenario: Upload fails during a lost network connection and retries automatically
    Given Sofia has captured and confirmed metadata for her white silk blouse
    And her network connection is unavailable at the moment of upload
    When the upload fails
    Then she sees "Upload paused — we'll retry when you're back online"
    And no item is added to her wardrobe count yet
    When her network connection is restored
    Then the upload completes automatically without any action from Sofia
    And her item count increases
    And she does not need to re-photograph or re-enter the details

  @pending
  @error-path
  Scenario: AI service is unavailable and item enters pending review
    Given Sofia has captured a photo
    And the AI service is temporarily unavailable
    When the photo is submitted for processing
    Then the item enters a "pending review" state
    And Sofia sees "We're still processing your photo — we'll notify you when it's ready"
    And she is not blocked from photographing other items

  @pending
  @error-path
  Scenario: Sofia's photo contains a person and she is prompted before uploading
    Given Sofia is on the item capture screen
    When she captures a photo that contains a visible human face
    Then the upload does not proceed automatically
    And she sees "This photo may include a person — crop or retake before uploading?"
    And she is offered options to retake or crop the photo
    And the item is only uploaded after she retakes or crops and confirms

  @pending
  @error-path
  Scenario: Sofia deletes an item from her wardrobe
    Given Sofia has 6 confirmed items in her wardrobe
    And one of her items is her white silk blouse
    When she deletes the white silk blouse from her wardrobe
    Then the blouse is removed from her wardrobe grid
    And her item count decreases to 5
    And any outfit suggestions that included the blouse are marked as no longer available

  @pending
  @property
  Scenario: Photo location data is never retained after upload
    Given any garment photo is uploaded to the wardrobe
    When the photo is stored
    Then the stored image contains no GPS coordinates or location metadata

  Scenario Outline: AI classification is presented pre-filled for common garment types
    Given Sofia is on the item capture screen
    And the AI service returns a confident classification
    When she photographs a <garment_type>
    Then the category field shows "<expected_category>"
    And the subcategory field shows "<expected_subcategory>"

    Examples: Common garment types
      | garment_type           | expected_category | expected_subcategory |
      | camel trench coat      | Outerwear         | Coat                 |
      | dark slim jeans        | Bottoms           | Jeans                |
      | white silk blouse      | Tops              | Blouse               |
      | ankle boots            | Footwear          | Boots                |
      | knit turtleneck jumper | Tops              | Knitwear             |
