from .service import ClassificationPrivacyService

classification_privacy = ClassificationPrivacyService()

def classify_privacy_global(company_name, html_content, markdown_content):
    result = classification_privacy.generate_classification_content(company_name, html_content, markdown_content)

    return result