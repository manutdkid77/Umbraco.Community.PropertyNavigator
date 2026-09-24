namespace Umbraco.Community.PropertyNavigator.Configuration;

// Bound from the "PropertyNavigator" section of appsettings.json.
public class PropertyNavigatorOptions
{
    // Master switch: when false the package does nothing and the Content view behaves as stock Umbraco.
    public bool Enabled { get; set; } = true;

    // Show the filter box above the field list.
    public bool EnableSearch { get; set; } = true;

    // Show each field's description (and match it when filtering).
    public bool ShowDescriptions { get; set; } = false;

    // Show each field's property alias to all users (and match it when filtering).
    public bool ShowAliases { get; set; } = false;

    // Briefly draw a ring around the field after jumping to it.
    public bool HighlightField { get; set; } = true;
}
