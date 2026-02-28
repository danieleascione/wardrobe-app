@integration @seam_verification
Feature: Integration seams between use cases and external service mocks
  As a developer implementing PocketWardrobe
  I want to verify that mock adapters honour the outbound port contracts
  So that acceptance tests exercise real domain logic against correctly shaped fakes

  # These scenarios verify the boundary between real use case logic and injected mock adapters.
  # They do NOT test the real Nano Banana API, Open-Meteo, or S3 — they test mock fidelity.
  # Driving port used: varies per seam (use cases called directly through their inbound ports).

  Background:
    Given the test world is configured with mock external adapters
    And a test user "integration-user" exists with a clean wardrobe

  @smoke
  Scenario: AI image processing mock returns a correctly shaped classification result
    Given the AI processing mock is configured to classify a coat photo as:
      | category    | Outerwear        |
      | subcategory | Coat             |
      | color       | Camel / Warm tan |
      | seasons     | Spring, Autumn, Winter |
      | occasions   | Work, Casual     |
      | confidence  | 0.92             |
    When the item digitisation use case processes the coat photo
    Then the result contains a background-removed image URL
    And the result contains a category of "Outerwear" and subcategory "Coat"
    And the result contains colour "Camel / Warm tan"
    And the confidence score is 0.92
    And the result includes seasons and occasions arrays

  @smoke
  Scenario: Weather service mock returns a correctly shaped weather context
    Given the weather service mock is configured to return for Milan on today's date:
      | temperature | 7        |
      | condition   | partly_cloudy |
      | city        | Milan    |
    When the outfit suggestion use case requests today's weather for Milan
    Then the weather context contains city "Milan"
    And the temperature is 7 degrees Celsius
    And the condition is "partly cloudy"
    And the date matches today's date

  @smoke
  Scenario: Weather service mock returning null results in an outfit being generated without weather context
    Given the weather service mock is configured to return no data (service unavailable)
    And the test user has 8 confirmed items in their wardrobe
    When the outfit suggestion use case generates today's outfit
    Then an outfit suggestion is returned containing at least 3 items
    And the outfit's weather context field is absent
    And no error is raised by the use case

  @smoke
  Scenario: Image storage mock stores an item and returns a correctly formatted CDN URL
    Given a processed garment image is ready to be stored
    When the image storage use case stores the thumbnail
    Then the returned thumbnail URL matches the pattern "https://cdn.pocketwardrobe.com/{userId}/{itemId}/thumb.webp"
    And the returned original URL matches the pattern for cold storage
    And the stored image record can be retrieved by its item identifier

  @smoke
  Scenario: Wardrobe repository can persist and retrieve a confirmed item
    Given a new item "Camel Wool Coat" with category "Outerwear" is confirmed for the test user
    When the item is persisted through the wardrobe repository
    Then the item can be retrieved by the test user's wardrobe identifier
    And the retrieved item has category "Outerwear" and subcategory "Coat"
    And the retrieved item has status "active"
    And the test user's item count is 1

  @smoke
  Scenario: Face detection mock signals when a face is present in a photo
    Given the face detection mock is configured to detect a face in the test photo
    When the item digitisation use case processes the photo
    Then the digitisation does not proceed to AI classification
    And the result signals that a face was detected
    And the photo is not submitted to the AI service

  @pending
  Scenario: Consent log mock records a consent event with required fields
    Given the consent log mock is ready to record events
    When photo storage consent is granted by the test user with policy version "v1.0"
    Then the consent log records an event with:
      | consent_type    | photo_storage |
      | consent_version | v1.0          |
      | user_id         | test user     |
    And the event has a timestamp set to approximately now

  @pending
  Scenario: Outfit history is checked before generating a new suggestion
    Given the test user accepted an outfit on the previous day containing items A, B, and C
    And the test user has exactly 15 confirmed items in their wardrobe
    When today's outfit suggestion is generated
    Then the suggestion does not repeat the exact combination of items A, B, and C
    And the outfit repository's history query is called with a 7-day window

  @pending
  Scenario: Style profile mock defaults apply when calibration was skipped
    Given the test user skipped style calibration
    When the outfit suggestion use case loads the user's style profile
    Then the style profile has archetype "Classic"
    And the occasion priorities list contains "Work" and "Casual"
    And the palette is "Neutral"
