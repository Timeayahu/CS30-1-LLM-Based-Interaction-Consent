from .service import ClassificationPrivacyService

classification_privacy = ClassificationPrivacyService()

def classify_privacy_global(company_name, html_content, markdown_content):
    # call the classification service for the privacy policy
    result = classification_privacy.generate_classification_content(company_name, html_content, markdown_content)

    return result