using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.PropertyNavigator.Configuration;

namespace Umbraco.Community.PropertyNavigator.Composers;

// No Swagger/OpenAPI document registration: v18 replaced Swashbuckle, and the types differ between 17 and 18.
public class PropertyNavigatorComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
        => builder.Services.Configure<PropertyNavigatorOptions>(
            builder.Config.GetSection(Constants.ConfigurationSection));
}
